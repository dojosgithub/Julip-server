// * Libraries
import express, { Router } from 'express'

// * Controllers
import { CONTROLLER_TEMPLATE } from '../controllers'

// * Utilities
// import { validateRegistration } from '../models/User'
// import { USER_PERMISSIONS, USER_ROLE } from '../utils/user'

// * Middlewares
import { validateMiddleware, permitMiddleware, Authenticate } from '../middlewares'
import { parser } from '../utils/cloudinary'
import { totpRateLimiter } from '../utils/rateLimiter'
import { USER_TYPES } from '../utils'
import { CONTROLLER_PRICING } from '../controllers/pricing'

const router = Router()

router.post('/select', Authenticate(), CONTROLLER_PRICING.selectPricing)

router.post('/create-customer', Authenticate(), CONTROLLER_PRICING.createCustomer)

router.post('/create-subscription', Authenticate(), CONTROLLER_PRICING.createSubscription)

router.put('/update-subscription/:subscriptionId', Authenticate(), CONTROLLER_PRICING.updateSubscription)

router.delete('/delete-subscription/:subscriptionId', Authenticate(), CONTROLLER_PRICING.deleteSubscription)

router.post('/payment-method', Authenticate(), CONTROLLER_PRICING.createPaymentMethod)

router.post('/webhooks/stripe', express.raw({ type: 'application/json' }), CONTROLLER_PRICING.handleStripeWebhook)

router.get('/retrieve-subscription/:subscriptionId', Authenticate(), CONTROLLER_PRICING.retrieveSubscription)

// Stripe Connect

router.post('/purchase', Authenticate(), CONTROLLER_PRICING.purchaseProduct)

router.post('/create-stripe', Authenticate(), CONTROLLER_PRICING.connectStripeAccount)

router.post('/webhooks/stripe/connect', Authenticate(), CONTROLLER_PRICING.handleInfluencerWebhook)

router.post('/stripe/oauth/callback', Authenticate(), CONTROLLER_PRICING.stripeCallback)

router.get('/testing', Authenticate(), CONTROLLER_PRICING.createTestaccount)

router.post('/details', Authenticate(), CONTROLLER_PRICING.getDetails)

router.get('/stripe-user', Authenticate(), CONTROLLER_PRICING.getUsersWithStripeAccount)

// router.post('/select', Authenticate(), CONTROLLER_PRICING.selectPricing)

// router.post('/select', Authenticate(), CONTROLLER_PRICING.selectPricing)

export default router
