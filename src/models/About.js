import mongoose, { Schema, model } from 'mongoose'
import { DOC_STATUS, USER_ROLE } from '../utils/user'
import crypto from 'crypto'
import Joi, { boolean } from 'joi'
import mongoosePaginate from 'mongoose-paginate-v2'
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2'

const aboutItemSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['heading', 'description', 'image'],
    required: true,
  },
  value: {
    type: String,
    required: true,
  },
  visibility: {
    type: Boolean,
    default: true,
  },
  sequence: {
    type: Number,
  },
})

const aboutSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  items: [aboutItemSchema], // An array to maintain the sequence
})

export const About = model('About', aboutSchema)
