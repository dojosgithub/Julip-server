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
import {
  User,
  TOTP,
  Group,
  Post,
  Comment,
  Badge,
  Challenge,
  UserChallengeProgress,
  Template,
  Subscription,
  Product,
} from '../models'

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
      const { customerId, priceId, paymentMethodId } = req.body
      const { _id: userId } = req.decoded

      // Attach payment method to customer
      await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId })

      // Set the payment method as default
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      })

      // Create subscription with a 14-day free trial
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        default_payment_method: paymentMethodId,
        trial_period_days: 14, // Add trial period
        expand: ['latest_invoice.payment_intent'],
      })
      console.log('zxcvbnm', subscription)
      // Save subscription details to database
      const newSubscription = new Subscription({
        user: userId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        plan: subscription.items.data[0].price.nickname,
        status: subscription.status,
        trialEndDate: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        metadata: subscription.metadata,
      })
      await newSubscription.save()

      res.status(200).json({
        subscriptionId: subscription.id,
        clientSecret: subscription.latest_invoice.payment_intent?.client_secret,
      })
    } catch (err) {
      console.error('Error creating subscription:', err)
      res.status(500).json({ error: err.message })
    }
  }),

  createPaymentMethod: asyncMiddleware(async (req, res) => {
    try {
      // Using a pre-generated test card token (for example, "tok_visa")
      const paymentMethod = await stripe.paymentMethods.create({
        type: 'card',
        card: {
          token: 'tok_visa', // Example token for Visa test card
        },
        billing_details: {
          name: 'Test User',
          email: 'test@example.com',
        },
      })

      console.log('PaymentMethod created successfully:', paymentMethod.id)
      res.status(200).json({
        paymentMethod: paymentMethod.id,
      })
    } catch (err) {
      console.error('Error creating payment method:', err.message)
      throw err
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

      // Fetch the current subscription to get the subscription item ID
      const currentSubscription = await stripe.subscriptions.retrieve(subscriptionId)

      // Update subscription in Stripe
      const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
        items: [
          {
            id: currentSubscription.items.data[0].id, // Use the current subscription's item ID
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
      // const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
      const event = stripe.webhooks.constructEvent(req.body, sig, 'whsec_a4JIY3Ox5kyWXDj3ntLmLd5nJU24lwwM')

      switch (event.type) {
        case 'customer.subscription.trial_will_end':
          const subscription = event.data.object

          // Optional: Fetch user details using your database
          const user = await Subscription.findOne({
            stripeSubscriptionId: subscription.id,
          }).populate('user') // Assuming `user` is referenced

          if (user) {
            // Send a notification/email to the user about the trial ending
            console.log(`Trial will end soon for user: ${user.user.email}`)

            // Example: Sending an email notification
            // await sendEmail({
            //   to: user.user.email,
            //   subject: 'Your Trial is Ending Soon',
            //   text: `Hi ${user.user.name}, your trial for the subscription is ending soon. Please update your payment details to avoid interruption.`,
            // })
          }

          break

        default:
          console.log(`Unhandled event type: ${event.type}`)
      }

      res.status(200).send('Webhook received successfully')
    } catch (err) {
      console.error('Error handling Stripe webhook:', err.message)
      res.status(400).send(`Webhook error: ${err.message}`)
    }
  }),

  // Stripe Connect APIs
  connectStripeAccount: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded

    // Create a Stripe Connect account for the influencer
    const account = await stripe.accounts.create({
      type: 'express', // Use 'express' for influencers to manage their account via your platform
      country: 'US', // Set the country code as needed
      email: req.body.email, // Influencer's email
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    })

    // Save the Stripe account ID to the influencer's profile in your database
    const influencer = await User.findByIdAndUpdate(userId, { stripeAccountId: account.id }, { new: true })

    if (!influencer) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Influencer not found.',
      })
    }

    // Generate an account link for the influencer to complete onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      // refresh_url: 'https://yourplatform.com/reauth', // Redirect URL if onboarding is incomplete
      // return_url: 'https://yourplatform.com/success', // Redirect URL after successful onboarding
      refresh_url: 'https://dev.myjulip.com/dashboard/about/', // Redirect URL if onboarding is incomplete
      return_url: 'https://dev.myjulip.com/dashboard/pages/', // Redirect URL after successful onboarding
      type: 'account_onboarding',
    })

    res.status(StatusCodes.OK).json({
      accountLink: accountLink.url,
      message: 'Stripe account created successfully. Redirect influencer to the account link.',
    })
  }),

  connectStripeAccount: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded

    try {
      // Create a Stripe Connect account with required capabilities
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: req.body.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
          legacy_payments: { requested: true },
        },
        business_type: 'individual',
        tos_acceptance: {
          service_agreement: 'recipient',
        },
      })

      // Save the Stripe account ID to the influencer's profile
      const influencer = await User.findByIdAndUpdate(userId, { stripeAccountId: account.id }, { new: true })

      if (!influencer) {
        return res.status(StatusCodes.NOT_FOUND).json({
          message: 'Influencer not found.',
        })
      }

      // Generate an account link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: 'https://dev.myjulip.com/dashboard/about/',
        return_url: 'https://dev.myjulip.com/dashboard/pages/',
        type: 'account_onboarding',
      })

      res.status(StatusCodes.OK).json({
        accountLink: accountLink.url,
        message: 'Stripe account created successfully. Please complete onboarding.',
      })
    } catch (error) {
      console.error('Error creating Stripe account:', error)
      res.status(StatusCodes.BAD_REQUEST).json({
        message: error.message,
      })
    }
  }),

  // Updated purchase product endpoint
  purchaseProduct: asyncMiddleware(async (req, res) => {
    const { productId, paymentMethodId, influencerId } = req.body

    // Fetch the product details
    const product = await Product.findById(productId)
    if (!product) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Product not found.',
      })
    }

    // Fetch the influencer
    const influencer = await User.findById(influencerId)
    if (!influencer || !influencer.stripeAccountId) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Influencer or Stripe account not found.',
      })
    }

    try {
      // Verify the account status and capabilities
      const account = await stripe.accounts.retrieve(influencer.stripeAccountId)

      if (!account.capabilities?.transfers === 'active') {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: 'Influencer account setup is incomplete. Please complete the onboarding process.',
        })
      }

      // Create PaymentIntent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: product.price * 100,
        currency: product.currency || 'usd',
        payment_method_types: ['card'],
        application_fee_amount: Math.round(product.price * 100 * 0.1),
        transfer_data: {
          destination: influencer.stripeAccountId,
        },
      })

      res.status(StatusCodes.OK).json({
        clientSecret: paymentIntent.client_secret,
        message: 'Payment intent created successfully.',
      })
    } catch (error) {
      console.error('Payment error:', error)
      res.status(StatusCodes.BAD_REQUEST).json({
        message: error.message,
      })
    }
  }),
  handleInfluencerWebhook: asyncMiddleware(async (req, res) => {
    const sig = req.headers['stripe-signature']
    const payload = req.body

    try {
      const event = stripe.webhooks.constructEvent(payload, sig, process.env.STRIPE_WEBHOOK_SECRET)

      switch (event.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object
          console.log('Payment succeeded:', paymentIntent.id)
          // Handle successful payment (e.g., update your database)
          break

        case 'payment_intent.payment_failed':
          const failedPaymentIntent = event.data.object
          console.log('Payment failed:', failedPaymentIntent.id)
          // Handle failed payment
          break

        default:
          console.log(`Unhandled event type: ${event.type}`)
      }

      res.status(200).send('Webhook received successfully')
    } catch (err) {
      console.error('Error handling Stripe webhook:', err.message)
      res.status(400).send(`Webhook error: ${err.message}`)
    }
  }),
  stripeCallback: asyncMiddleware(async (req, res) => {
    const { code } = req.query
    const { _id: userId } = req.decoded

    try {
      // Exchange the authorization code for a Stripe account ID
      const response = await stripe.oauth.token({
        grant_type: 'authorization_code',
        code: code,
      })

      const stripeAccountId = response.stripe_user_id

      // Save the Stripe account ID to your database
      const seller = await User.findOneAndUpdate({ _id: userId }, { stripeAccountId: stripeAccountId }, { new: true })

      res.status(200).json({
        message: 'Stripe account connected successfully!',
        stripeAccountId: stripeAccountId,
      })
    } catch (err) {
      console.error('Error during Stripe OAuth:', err)
      res.status(500).json({ error: err.message })
    }
  }),
  createTestaccount: asyncMiddleware(async (req, res) => {
    try {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: 'test-influencer@example.com',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      })

      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: 'https://dev.myjulip.com/dashboard/about/',
        return_url: 'https://dev.myjulip.com/dashboard/pages/',
        type: 'account_onboarding',
      })
    } catch (err) {
      console.error('Error during Stripe OAuth:', err)
      res.status(500).json({ error: err.message })
    }
  }),
  getDetails: asyncMiddleware(async (req, res) => {
    const { stripeId } = req.body

    try {
      // Retrieve the account details
      const account = await stripe.accounts.retrieve(stripeId)

      // Log capabilities and missing requirements
      console.log('Capabilities:', account.capabilities)
      console.log('Currently Due:', account.requirements.currently_due)

      // Check if the account is incomplete
      if (account.requirements.currently_due.length > 0) {
        // Generate an account link for onboarding
        const accountLink = await stripe.accountLinks.create({
          account: stripeId,
          refresh_url: 'https://dev.myjulip.com/dashboard/about/', // Redirect if onboarding is incomplete
          return_url: 'https://dev.myjulip.com/dashboard/about/', // Redirect after onboarding is complete
          type: 'account_onboarding',
        })

        return res.status(StatusCodes.OK).json({
          message: 'Account setup is incomplete. Please complete the onboarding process.',
          accountLink: accountLink.url,
          currentlyDue: account.requirements.currently_due,
        })
      }

      // If the account is complete, return the details
      res.status(StatusCodes.OK).json({
        capabilities: account.capabilities,
        requirements: account.requirements,
        message: 'Account details retrieved successfully.',
      })
    } catch (err) {
      console.error('Error retrieving account details:', err)
      res.status(500).json({ error: err.message })
    }
  }),
  getUsersWithStripeAccount: asyncMiddleware(async (req, res) => {
    try {
      // Query the database for users with a non-empty stripeAccountId
      const users = await User.find({
        stripeAccountId: { $exists: true, $ne: null, $ne: '' },
      }).select('-password') // Exclude the password field from the response

      // If no users are found, return a 404 error
      if (!users || users.length === 0) {
        return res.status(StatusCodes.NOT_FOUND).json({
          message: 'No users with a Stripe account found.',
        })
      }

      // Return the list of users
      res.status(StatusCodes.OK).json({
        data: users,
        message: 'Users with Stripe accounts retrieved successfully.',
      })
    } catch (err) {
      console.error('Error retrieving users with Stripe accounts:', err)
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: 'An error occurred while retrieving users.',
        error: err.message,
      })
    }
  }),
}
