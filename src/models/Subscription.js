import mongoose from 'mongoose'

const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Reference to the User model
      required: true,
    },
    stripeCustomerId: {
      type: String,
      required: true, // The customer's Stripe ID
    },
    stripeSubscriptionId: {
      type: String,
      required: true, // The subscription's Stripe ID
    },
    paymentMethodId: {
      type: String,
    },
    plan: {
      type: String, // Plan nickname or plan ID from Stripe
      required: false,
    },
    status: {
      type: String,
      enum: ['active', 'canceled', 'incomplete', 'past_due', 'trialing', 'unpaid'],
      default: 'incomplete',
    },
    trialEndDate: {
      type: Date, // Trial end date if applicable
    },
    currentPeriodStart: {
      type: Date, // The start of the current billing cycle
    },
    currentPeriodEnd: {
      type: Date, // The end of the current billing cycle
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false, // Indicates if the subscription will cancel at the end of the billing period
    },
    metadata: {
      type: Object, // Custom metadata from Stripe
    },
    createdAt: {
      type: Date,
      default: Date.now, // Timestamp for when the subscription was created
    },
    updatedAt: {
      type: Date,
      default: Date.now, // Timestamp for the last update
    },
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt fields
)

export const Subscription = mongoose.model('Subscription', subscriptionSchema)
