import mongoose, { Schema, model } from 'mongoose'
import { DOC_STATUS, USER_ROLE } from '../utils/user'
import crypto from 'crypto'
import Joi from 'joi'
import mongoosePaginate from 'mongoose-paginate-v2'
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2'

export const templateSchema = new Schema(
  {
    fullName: String,
    theme: {
      type: String,
      required: true,
    },
    mode: {
      type: String,
      required: true,
    },
    theme: {
      type: String,
      required: true,
    },
  },
  { versionKey: false, timestamps: true }
)

export const Template = model('Template', templateSchema)
