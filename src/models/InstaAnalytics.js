import mongoose, { Schema } from 'mongoose'

const InstaAnalyticsSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  instagramUserId: {
    type: String,
    required: true,
  },
  accessToken: {
    type: String,
    required: true,
  },
  accessTokenExpiry: {
    type: Date,
    required: false, // IG tokens might not return expiry in all cases
  },
  followersCount: {
    type: Number,
    default: 0,
  },
  totalViews: {
    type: Number,
    default: 0,
  },
  totalLikes: {
    type: Number,
    default: 0,
  },
  totalComments: {
    type: Number,
    default: 0,
  },
  totalShares: {
    type: Number,
    default: 0,
  },
  avgLikes: {
    type: Number,
    default: 0,
  },
  avgComments: {
    type: Number,
    default: 0,
  },
  avgShares: {
    type: Number,
    default: 0,
  },
  media: [
    {
      media_type: String,
      media_url: String,
      permalink: String,
      like_count: Number,
      comments_count: Number,
      share_count: {
        type: Number,
        default: 0,
      },
    },
  ],
  reachBreakdown: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  lastSyncedAt: {
    type: Date,
    default: Date.now,
  },
})

export const InstaAnalytics = mongoose.model('InstaAnalytics', InstaAnalyticsSchema)
