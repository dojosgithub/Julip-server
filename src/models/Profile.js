import mongoose, { Schema, model } from 'mongoose'
import { CAR_STATUS, DOC_STATUS } from '../utils/user'
import Joi, { object } from 'joi'
import mongoosePaginate from 'mongoose-paginate-v2'
import aggregatePaginate from 'mongoose-aggregate-paginate-v2'

export const profileSchema = new Schema(
  {
    bio: String,
    profileName: String,
    description: String,
    socialLinks: [
      {
        platform: {
          type: String,
          enum: [
            'Instagram',
            'TikTok',
            'YouTube',
            'Facebook',
            'Discord',
            'Threads',
            'LinkedIn',
            'Pinterest',
            'Spotify',
            'Snapchat',
          ],
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
      },
    ],
    webLinks: [
      {
        title: {
          type: String,
          required: true,
        },
        link: {
          type: String,
          required: true,
        },
      },
    ],
  },
  { versionKey: false, timestamps: true }
)

export const Post = model('Profile', profileSchema)
