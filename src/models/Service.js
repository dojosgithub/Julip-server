import mongoose, { Schema, model } from 'mongoose'

export const seviceSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
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
    buttonTitle: {
      type: String, // Optional field
    },
    buttonUrl: {
      type: String, // Optional field
    },
    landingPage: {
      type: mongoose.Types.ObjectId,
      ref: 'LandingPage',
    },
    visibility: {
      type: Boolean,
      default: true,
    },
  },
  { versionKey: false, timestamps: true }
)

export const Service = model('Service', seviceSchema)
