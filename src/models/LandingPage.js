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
      type: String,
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
    name: {
      type: Number,
    },
    email: {
      type: Number,
    },
    phoneNumber: {
      type: Number,
    },
    isPhoneNumberRequired: {
      type: Number,
      default: true,
    },
    instagram: {
      type: Number,
    },
    isinstagramNumberRequired: {
      type: Number,
      default: true,
    },
    buttonTitle: {
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
    visibility: {
      type: Boolean,
      default: true,
    },
  },
  { versionKey: false, timestamps: true }
)

export const LandingPage = model('LandingPage', landingPageSchema)
