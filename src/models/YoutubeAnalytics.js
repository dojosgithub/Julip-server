import mongoose, { Schema } from 'mongoose'

const youtubeAnalyticsSchema = new mongoose.Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    channelId: { type: String },

    refreshToken: { type: String },
    accessToken: { type: String },
    tokenExpiry: { type: Date },
    refreshTokenExpiry: { type: Date },

    lastSyncedAt: { type: Date, default: Date.now },

    totalViews: Number, // ← was totalReach
    totalLikes: Number,
    totalComments: Number,
    totalShares: Number,
    totalEngagements: Number,
    engagementRate: Number, // ← add this
    totalWatchTime: Number,

    averageLikes: Number,
    averageComments: Number,
    averageShares: Number,
    averageWatchTime: Number,
    subscriberCount: Number,
    duration: String,

    demographics: Object,
    countryStats: Object,

    rawImpressions: Object,
    rawAnalytics: Object,

    subscriber: String,
    needsReauthorization: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const YoutubeAnalytics = mongoose.model('YoutubeAnalytics', youtubeAnalyticsSchema)
