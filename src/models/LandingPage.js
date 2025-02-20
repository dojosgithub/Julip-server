import mongoose, { Schema, model } from 'mongoose'

export const landingPageSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: 'Service',
    },
    landingPageName: {
      type: String,
      required: true,
    },
    image: {
      type: String,
    },

    time: {
      type: Number,
    },

    timeUnit: {
      type: String,
      enum: ['minutes', 'hours', 'day', 'week'],
    },
    currency: {
      type: String,
      enum: ['USD', 'EUR', 'GBP', 'JPY', 'AUD'],
    },
    price: {
      type: Number,
    },
    testimonials: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Testimonials',
      },
    ],
    recurrung: {
      type: String,
      enum: ['monthly', 'yearly'],
    },
    body: {
      type: String,
    },
    name: {
      type: String,
    },
    email: {
      type: String,
    },
    phoneNumber: {
      type: Number,
    },
    isPhoneNumberRequired: {
      type: Boolean,
      default: true,
    },
    instagram: {
      type: String,
    },
    isinstagramNumberRequired: {
      type: Boolean,
      default: true,
    },
    buttonTitle: {
      type: String, // Optional field
    },
    buttonUrl: {
      type: String, // Optional field
    },
    textFields: [
      {
        text: {
          type: String,
        },
        value: {
          type: String,
        },
      },
    ],
  },
  { versionKey: false, timestamps: true }
)

export const LandingPage = model('LandingPage', landingPageSchema)
