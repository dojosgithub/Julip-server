import mongoose, { Schema, model } from 'mongoose'
import { DOC_STATUS, USER_ROLE } from '../utils/user'
import crypto from 'crypto'
import Joi from 'joi'
import mongoosePaginate from 'mongoose-paginate-v2'
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2'

export const templateSchema = new Schema(
  {
    mode: {
      type: String,
      required: true,
    },
    colors: {
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
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { versionKey: false, timestamps: true }
)

export const Template = model('Template', templateSchema)
