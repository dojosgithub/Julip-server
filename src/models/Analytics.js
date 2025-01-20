import mongoose, { Schema, model } from 'mongoose'

const analyticsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  webClicks: [
    {
      timestamp: { type: Date, default: Date.now() },
      location: {
        country: { type: String, default: 'Unknown' },
        city: { type: String, default: 'Unknown' },
      },
    },
  ],
  webViews: [
    {
      timestamp: { type: Date, default: Date.now() },
      location: {
        country: { type: String, default: 'Unknown' },
        city: { type: String, default: 'Unknown' },
      },
    },
  ],
  tabViews: {
    type: Map,
    of: new mongoose.Schema({
      count: { type: Number, default: 0 },
      timestamp: { type: Date, default: Date.now },
    }),
    default: new Map(),
  },
  products: [
    {
      productName: { type: String },
      timestamp: { type: Date, default: Date.now() },
      count: { type: Number, default: 0 },
    },
  ],
})

export const Analytics = model('Analytics', analyticsSchema)
