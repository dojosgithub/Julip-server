import mongoose, { Schema, model } from 'mongoose'
import { DOC_STATUS, USER_ROLE } from '../utils/user'
import crypto from 'crypto'
import Joi, { boolean } from 'joi'
import mongoosePaginate from 'mongoose-paginate-v2'
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2'

const audienceItemSchema = new mongoose.Schema({
  demographics: {
    type: [
      {
        key: { type: String, enum: ['gender', 'age', 'location'] },
        label: { type: String },
        visibility: { type: Boolean },
      },
    ],
    default: [
      { key: 'gender', label: 'Gender', visibility: false },
      { key: 'age', label: 'Age', visibility: false },
      { key: 'location', label: 'Location', visibility: false },
    ],
  },
  engagements: {
    type: [
      {
        label: {
          type: String,
          enum: [
            'Followers',
            'Engagement',
            'TotalImpressions30Days',
            'TotalReach30Days',
            'AvgCommentsLast10Posts',
            'AvgReelsViewsLast10Posts',
            'AvgReelsWatchTimeLast10Posts',
          ],
        },
        visibility: { type: Boolean },
      },
    ],
    default: [
      { label: 'Followers', visibility: false },
      { label: 'Engagement', visibility: false },
      { label: 'TotalImpressions30Days', visibility: false },
      { label: 'TotalReach30Days', visibility: false },
      { label: 'AvgCommentsLast10Posts', visibility: false },
      { label: 'AvgReelsViewsLast10Posts', visibility: false },
      { label: 'AvgReelsWatchTimeLast10Posts', visibility: false },
    ],
  },
})

const platformSchema = new mongoose.Schema({
  platform: { type: String },
  username: { type: String },
  url: { type: String },
  _id: { type: String },
  platformVisibility: { type: Boolean, default: true },
  items: [audienceItemSchema],
})

const audienceSchema = new mongoose.Schema({
  instagram: platformSchema,
  tiktok: platformSchema,
  youtube: platformSchema,
  linkedin: platformSchema,
})

export const Audience = model('Audience', audienceSchema)
