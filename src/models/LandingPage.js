import mongoose, { Schema, model } from 'mongoose'

export const landingPageSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    name: {
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
      enum: ['usd', 'eur', 'gbp', 'jpy', 'aud'],
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
    },
    instagram: {
      type: Number,
    },
    isinstagramNumberRequired: {
      type: Number,
    },
    buttonTitle: {
      type: String, // Optional field
    },

    visibility: {
      type: Boolean,
      default: true,
    },
  },
  { versionKey: false, timestamps: true }
)

export const LandingPage = model('LandingPage', landingPageSchema)
