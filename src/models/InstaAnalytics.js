import mongoose, { Schema } from 'mongoose'

const InstaAnalyticsSchema = new Schema(
  {
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
    engagementRate: {
      type: Number,
      default: 0,
    },
    accessToken: {
      type: String,
      required: true,
    },
    longLivedToken: {
      type: String,
      required: true,
    },
    longLivedTokenExpiry: {
      type: Date,
      required: true,
    },
    accessTokenExpiry: {
      type: Date,
      required: false,
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
    impressions: {
      type: Number,
      default: 0,
    },
    totalReach30Days: {
      type: Number,
      default: 0,
    },
    numberOfPosts: {
      type: Number,
      default: 0,
    },
    audienceGenderAge: {
      type: Array,
      default: [],
    },
    audienceCountry: {
      type: Array,
      default: [],
    },
    audienceCity: {
      type: Array,
      default: [],
    },
    // media: [
    //   {
    //     media_type: String,
    //     media_url: String,
    //     permalink: String,
    //     like_count: Number,
    //     comments_count: Number,
    //     share_count: {
    //       type: Number,
    //       default: 0,
    //     },
    //   },
    // ],
    followersByGender: {
      type: Map,
      of: Number,
      default: {},
    },
    followersByAge: {
      type: Map,
      of: Number,
      default: {},
    },
    followersByCountry: {
      type: Map,
      of: Number,
      default: {},
    },
    reachBreakdown: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    lastSyncedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
)

export const InstaAnalytics = mongoose.model('InstaAnalytics', InstaAnalyticsSchema)
