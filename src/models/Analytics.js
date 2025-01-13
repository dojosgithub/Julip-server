import mongoose, { Schema, model } from 'mongoose'

export const analyticsSchema = new Schema(
  {
    url: {
      type: String,
      required: true,
    },
    brandName: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    buttonTitle: {
      type: String, // Optional field
    },
  },
  { versionKey: false, timestamps: true }
)

export const Product = model('Analytics', analyticsSchema)
