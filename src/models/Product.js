import mongoose, { Schema, model } from 'mongoose'

export const productSchema = new Schema(
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
    currency: {
      type: String,
      enum: ['USD', 'EUR', 'GBP', 'JPY', 'AUD'],
      default: 'USD',
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
    pinnedProductVisibility: {
      type: Boolean, // Optional field
      default: true,
    },
  },
  { versionKey: false, timestamps: true }
)

export const Product = model('Product', productSchema)
