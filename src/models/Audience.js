import mongoose, { Schema, model } from 'mongoose'
import { DOC_STATUS, USER_ROLE } from '../utils/user'
import crypto from 'crypto'
import Joi, { boolean } from 'joi'
import mongoosePaginate from 'mongoose-paginate-v2'
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2'

const audienceItemSchema = new mongoose.Schema({
  demographics: {
    gender: {
      type: Boolean,
    },
    age: {
      type: Boolean,
    },
    location: {
      type: Boolean,
    },
  },
  engagements: {
    followers: {
      type: Boolean,
    },
    engagement: {
      type: Boolean,
    },
    totalImpressions: {
      type: Boolean,
    },
    totalReach: {
      type: Boolean,
    },
    avgComment: {
      type: Boolean,
    },
    avgReelViews: {
      type: Boolean,
    },
    avgWatchTime: {
      type: Boolean,
    },
  },
})
const audienceSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  visibility: {
    type: Boolean,
  },
  instagram: {
    items: [audienceItemSchema],
  },
  tiktok: {
    items: [audienceItemSchema],
  },
  youtube: {
    items: [audienceItemSchema],
  },
  linkedin: {
    items: [audienceItemSchema],
  },
})

export const Audience = model('Audience', audienceSchema)
