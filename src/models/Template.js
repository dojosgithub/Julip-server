import mongoose, { Schema, model } from 'mongoose'
import { DOC_STATUS, USER_ROLE } from '../utils/user'
import crypto from 'crypto'
import Joi from 'joi'
import mongoosePaginate from 'mongoose-paginate-v2'
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2'

export const templateSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    predefined: {
      type: Boolean,
      default: false,
    },
    mode: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light',
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    colors: {
      dark: {
        main: {
          type: String,
          required: true,
        },
        background: {
          type: String,
          required: true,
        },
        buttons: {
          type: String,
          required: true,
        },
      },
      light: {
        main: {
          type: String,
          required: true,
        },
        background: {
          type: String,
          required: true,
        },
        buttons: {
          type: String,
          required: true,
        },
      },
    },

    fonts: {
      header: {
        type: String,
        required: true,
      },
      body: {
        type: String,
        required: true,
      },
    },
  },
  { versionKey: false, timestamps: true }
)

export const Template = model('Template', templateSchema)
