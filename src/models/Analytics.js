import mongoose, { Schema, model } from 'mongoose'

const analyticsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    webClicks: {
      timestamp: {
        type: Date,
        default: Date.now,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
    webViews: {
      timestamp: {
        type: Date,
        default: Date.now,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
    tabViews: {
      type: Map, // Use a Map for dynamic tab names
      of: {
        timestamp: {
          type: Date,
          default: Date.now,
        },
        count: {
          type: Number,
          default: 0,
        },
      },
    },
    products: {
      type: Map,
      of: {
        timestamp: {
          type: Date,
          default: Date.now,
        },
        count: {
          type: Number,
          default: 0,
        },
      },
    },
  },
  { versionKey: false, timestamps: true }
)

export const Analytics = model('Analytics', analyticsSchema)
