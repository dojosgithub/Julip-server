import mongoose, { Schema } from 'mongoose'

const tiktokAnalyticsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  accessToken: {
    type: String,
    required: true,
  },
  accessTokenExpiry: {
    type: Date,
    required: true,
  },
  refreshToken: {
    type: String,
    required: true,
  },
  refreshTokenExpiry: {
    type: Date,
    default: null, // TikTok may not always return it
  },
  openId: {
    type: String,
    required: true,
  },
  avatar: {
    type: String,
  },
  displayName: {
    type: String,
  },
  followers: {
    type: Number,
    default: 0,
  },
  lastSyncedAt: {
    type: Date,
    default: Date.now,
  },
  totalLikes: Number,
  totalComments: Number,
  totalShares: Number,
  totalViews: Number,
  avgLikes: Number,
  avgComments: Number,
  avgShares: Number,
  avgViews: Number,
  videos: [
    {
      id: String,
      title: String,
      view_count: Number,
      like_count: Number,
      comment_count: Number,
      share_count: Number,
      cover_image_url: String,
    },
  ],
})
export const TikTokAnalytics = mongoose.model('TikTokAnalytics', tiktokAnalyticsSchema)
