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
        key: { type: String, enum: ['gender', 'age', 'location'], required: true },
        label: { type: String, required: true },
        visibility: { type: Boolean, default: false },
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
          required: true,
        },
        visibility: { type: Boolean, default: false },
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

const audienceSchema = new mongoose.Schema({
  instagram: {
    _id: { type: String },
    items: [audienceItemSchema],
  },
  tiktok: {
    _id: { type: String },
    items: [audienceItemSchema],
  },
  youtube: {
    _id: { type: String },
    items: [audienceItemSchema],
  },
  linkedin: {
    _id: { type: String },
    items: [audienceItemSchema],
  },
})

export const Audience = model('Audience', audienceSchema)
