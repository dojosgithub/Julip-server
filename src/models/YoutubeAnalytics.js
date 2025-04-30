import mongoose, { Schema } from 'mongoose'

const youtubeAnalyticsSchema = new mongoose.Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    // userEmail: { type: String, required: true }, // Email to notify
    channelId: { type: String },

    // Tokens
    refreshToken: { type: String },
    accessToken: { type: String },
    tokenExpiry: { type: Date }, // Optional: if Google returns an expiry timestamp for the access token
    refreshTokenExpiry: { type: Date }, // Optional: if you know when it expires (usually long-lived)

    // Last data pull
    lastSyncedAt: { type: Date, default: Date.now },

    // Analytics data
    totalReach: Number,
    totalLikes: Number,
    totalComments: Number,
    totalShares: Number,
    totalEngagements: Number,
    totalWatchTime: Number,

    averageLikes: Number,
    averageComments: Number,
    averageShares: Number,
    averageWatchTime: Number,
    duration: String,

    demographics: Object, // You can further break it down if needed
    countryStats: Object,

    rawImpressions: Object, // Keep raw response in case needed for graphs
    rawAnalytics: Object,
    subscriber: String,
    needsReauthorization: { type: Boolean, default: false },
  },
  { timestamps: true }
)

export const YoutubeAnalytics = mongoose.model('YoutubeAnalytics', youtubeAnalyticsSchema)
