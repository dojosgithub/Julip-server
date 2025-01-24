// * Libraries
import { StatusCodes } from 'http-status-codes'
import { isEmpty, isUndefined, concat, cloneDeep } from 'lodash'
import speakeasy, { totp } from 'speakeasy'
import mongoose, { model } from 'mongoose'
const axios = require('axios')
import passport from 'passport'
import dotenv from 'dotenv'

dotenv.config()

// * Models
import { User, TOTP, Group, Post, Comment, Badge, Challenge, UserChallengeProgress, Template } from '../models'

// * Middlewares
import { asyncMiddleware } from '../middlewares'

import { getLoginLinkByEnv, getSanitizeCompanyName, toObjectId } from '../utils/misc'
import { stripe } from '../utils/stripe'
import Email from '../utils/email'
import { escapeRegex } from '../utils/misc'
import { comparePassword, generateOTToken, generatePassword, generateToken, verifyTOTPToken } from '../utils'
import { sendSMS } from '../utils/smsUtil'
import { getIO } from '../socket'

const { ObjectId } = mongoose.Types

// const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
// const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
// const REDIRECT_URI = 'http://localhost:3000/api/user/auth/google/callback'

export const CONTROLLER_PRICING = {
  selectPricing: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded
    const { pricing } = req.body

    if (!pricing) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Pricing Plan is required.',
      })
    }
    // const template = await Template.findById(toObjectId(templateId))

    // if (!template) {
    //   return res.status(StatusCodes.NOT_FOUND).json({
    //     message: 'Template not found.',
    //   })
    // }
    const user = await User.findById(userId)
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'User not found.',
      })
    }
    user.isPricingSelected = true
    user.userTypes = pricing
    await user.save()

    res.status(StatusCodes.OK).json({
      data: null,
      message: 'Pricing Plan updated successfully.',
    })
  }),
  createCustomer: asyncMiddleware(async (req, res) => {
    const { email, name } = req.body

    const customer = await stripe.customers.create({
      email: email,
      name: name,
    })

    res.status(200).json({
      customerId: customer.id,
      message: 'Customer created successfully.',
    })
  }),
  chargeCustomer: asyncMiddleware(async (req, res) => {
    const { customerId, amount, currency } = req.body

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount * 100,
        currency: currency,
        customer: customerId,
      })

      res.status(200).json({
        paymentIntent,
        message: 'Payment charged successfully.',
      })
    } catch (err) {
      console.error(err)
      res.status(500).json({
        message: 'Failed to charge customer.',
        error: err.message,
      })
    }
  }),
  createSubscription: asyncMiddleware(async (req, res) => {
    try {
      const { customerId, priceId } = req.body

      // Create the subscription in Stripe
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      })

      // Save the subscription in the database
      const newSubscription = new Subscription({
        user: req.user.id, // Assuming the user is authenticated and `req.user.id` contains the user ID
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        plan: subscription.items.data[0].price.nickname, // Use price nickname or ID
        status: subscription.status,
        trialEndDate: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        metadata: subscription.metadata,
      })
      await newSubscription.save()

      res.status(200).json({
        subscriptionId: subscription.id,
        clientSecret: subscription.latest_invoice.payment_intent.client_secret,
      })
    } catch (err) {
      console.error('Error creating subscription:', err)
      res.status(500).json({ error: err.message })
    }
  }),
  retrieveSubscription: asyncMiddleware(async (req, res) => {
    try {
      const { subscriptionId } = req.params

      // Retrieve the subscription from Stripe
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)

      // Optional: Fetch subscription details from your database
      const storedSubscription = await Subscription.findOne({ stripeSubscriptionId: subscriptionId })

      res.status(200).json({ stripeSubscription: subscription, storedSubscription })
    } catch (err) {
      console.error('Error retrieving subscription:', err)
      res.status(500).json({ error: err.message })
    }
  }),
  updateSubscription: asyncMiddleware(async (req, res) => {
    try {
      const { subscriptionId } = req.params
      const { priceId } = req.body

      // Update subscription in Stripe
      const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
        items: [
          {
            id: updatedSubscription.items.data[0].id,
            price: priceId,
          },
        ],
      })

      // Update the subscription in your database
      const subscription = await Subscription.findOneAndUpdate(
        { stripeSubscriptionId: subscriptionId },
        {
          plan: updatedSubscription.items.data[0].price.nickname,
          status: updatedSubscription.status,
          currentPeriodStart: new Date(updatedSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000),
        },
        { new: true }
      )

      res.status(200).json({ message: 'Subscription updated successfully', subscription })
    } catch (err) {
      console.error('Error updating subscription:', err)
      res.status(500).json({ error: err.message })
    }
  }),
  deleteSubscription: asyncMiddleware(async (req, res) => {
    try {
      const { subscriptionId } = req.params

      // Cancel the subscription in Stripe
      const canceledSubscription = await stripe.subscriptions.del(subscriptionId)

      // Update subscription status in your database
      const subscription = await Subscription.findOneAndUpdate(
        { stripeSubscriptionId: subscriptionId },
        { status: canceledSubscription.status },
        { new: true }
      )

      res.status(200).json({ message: 'Subscription canceled successfully', subscription })
    } catch (err) {
      console.error('Error canceling subscription:', err)
      res.status(500).json({ error: err.message })
    }
  }),
  handleStripeWebhook: asyncMiddleware(async (req, res) => {
    const sig = req.headers['stripe-signature']

    try {
      const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)

      if (event.type === 'customer.subscription.updated') {
        const subscription = event.data.object

        // Update subscription in your database
        await Subscription.findOneAndUpdate(
          { stripeSubscriptionId: subscription.id },
          {
            status: subscription.status,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          }
        )
      }

      res.status(200).send('Webhook received successfully')
    } catch (err) {
      console.error('Error handling Stripe webhook:', err.message)
      res.status(400).send(`Webhook error: ${err.message}`)
    }
  }),
}
