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
      { _id: new mongoose.Types.ObjectId(), key: 'gender', label: 'Gender', visibility: false },
      { _id: new mongoose.Types.ObjectId(), key: 'age', label: 'Age', visibility: false },
      { _id: new mongoose.Types.ObjectId(), key: 'location', label: 'Location', visibility: false },
    ],
  },
  engagements: {
    type: [
      {
        _id: { type: String }, // String ID for subdocuments
        label: {
          type: String,
          // enum: [
          //   'Followers',
          //   'Engagement',
          //   'Total Impressions',
          //   'Total Reach',
          //   'Avg Comments',
          //   'Avg Reels Views',
          //   'Avg Reels Watch Time',
          // ],
        },
        // key: {
        //   type: String,
        //   enum: [
        //     'Followers',
        //     'Engagemnet',
        //     'TotalImpressions',
        //     'TotalReach',
        //     'Avg Comments',
        //     'Avg Reel Views',
        //     'Avg Reels Watch Time',
        //   ],
        // },

        visibility: { type: Boolean },
      },
    ],
    default: [
      { _id: new mongoose.Types.ObjectId(), label: 'Followers', visibility: false },
      { _id: new mongoose.Types.ObjectId(), label: 'Engagement', visibility: false },
      { _id: new mongoose.Types.ObjectId(), label: 'Total Impressions', visibility: false },
      { _id: new mongoose.Types.ObjectId(), label: 'Total Reach', visibility: false },
      { _id: new mongoose.Types.ObjectId(), label: 'Avg Comments', visibility: false },
      { _id: new mongoose.Types.ObjectId(), label: 'Avg Reels Views', visibility: false },
      { _id: new mongoose.Types.ObjectId(), label: 'Avg Reels Watch Time', visibility: false },
    ],
  },
})

export const Audience = model('Audience', audienceSchema)
