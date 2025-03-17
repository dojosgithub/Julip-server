import mongoose from 'mongoose'

const SocialMediaDataSchema = new mongoose.Schema({
  platform: String,
  followers: Number,
  impressions: Number,
  reach: Number,
  avgLikes: Number,
  avgComments: Number,
  avgViews: Number,
  avgWatchTime: Number,
  timestamp: { type: Date, default: Date.now },
})

export const SocialMediaData = mongoose.model('SocialMediaData', SocialMediaDataSchema)
