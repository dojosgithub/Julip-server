import mongoose, { Schema, model } from 'mongoose'
import { DOC_STATUS, USER_ROLE } from '../utils/user'
import crypto from 'crypto'
import Joi, { boolean } from 'joi'
import mongoosePaginate from 'mongoose-paginate-v2'
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2'

const aboutItemSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  type: {
    type: String,
    enum: ['heading', 'description', 'image'],
  },
  value: {
    type: String, // Changed to Mixed to support both strings and objects (e.g., image metadata)
  },
  label: {
    type: String, // Changed to Mixed to support both strings and objects (e.g., image metadata)
  },
  description: {
    type: String,
    default: '', // Optional field for descriptions
  },
  imageStyle: {
    type: String,
    enum: ['horizontal', 'vertical', 'square'], // Restrict to specific styles
    default: 'horizontal',
  },
  visibility: {
    type: Boolean,
    default: false,
  },
  descriptionVisibility: {
    type: Boolean,
    default: false, // Visibility of the description field
  },
  sequence: {
    type: Number,
    default: 0,
  },
})
const aboutSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Draft version of the profile
  draft: {
    items: [aboutItemSchema],
  },
  // Published version of the profile
  published: {
    items: [aboutItemSchema],
  },
  items: [aboutItemSchema], // An array to maintain the sequence
})

export const About = model('About', aboutSchema)
