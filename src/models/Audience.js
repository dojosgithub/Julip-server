import mongoose, { Schema, model } from 'mongoose'
import { DOC_STATUS, USER_ROLE } from '../utils/user'
import crypto from 'crypto'
import Joi, { boolean } from 'joi'
import mongoosePaginate from 'mongoose-paginate-v2'
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2'

const audienceSchema = new mongoose.Schema({
  platform: { type: String },
  username: { type: String },
  url: { type: String },
  platformVisibility: { type: Boolean, default: true },
  demographics: {
    type: [
      {
        _id: { type: String }, // String ID for subdocuments
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
        _id: { type: String }, // String ID for subdocuments
        label: {
          type: String,
          enum: [
            'Followers',
            'Engagement',
            'Total Impressions',
            'Total Reach',
            'Avg Comments (From Last 10 Posts)',
            'Avg Reels Views (From Last 10 Posts)',
            'Avg Reels Watch Time (From Last 10 Posts)',
          ],
        },
        visibility: { type: Boolean },
      },
    ],
    default: [
      { label: 'Followers', visibility: false },
      { label: 'Engagement', visibility: false },
      { label: 'Total Impressions', visibility: false },
      { label: 'Total Reach', visibility: false },
      { label: 'Avg Comments (From Last 10 Posts)', visibility: false },
      { label: 'Avg Reels Views (From Last 10 Posts)', visibility: false },
      { label: 'Avg Reels Watch Time (From Last 10 Posts)', visibility: false },
    ],
  },
})

export const Audience = model('Audience', audienceSchema)
