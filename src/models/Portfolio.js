import { Schema, model } from 'mongoose'

const portfolioContentSchema = {
  name: {
    type: String,
  },
  speciality: {
    name: {
      type: String,
      required: true,
    },
    visibility: {
      type: Boolean, // Optional field
      default: true,
    },
    specialityList: [String],
  },
  brand: {
    type: Schema.Types.ObjectId,
    ref: 'Brand',
  },
  audience: {
    type: Schema.Types.ObjectId,
    ref: 'Audience',
  },
  sample: {
    type: Schema.Types.ObjectId,
    ref: 'Sample',
  },
  testimonials: {
    type: Schema.Types.ObjectId,
    ref: 'Testimonials',
  },
  contact: {
    type: Schema.Types.ObjectId,
    ref: 'Contact',
  },
  visibility: {
    type: Boolean,
    default: false,
  },
}

export const portfolioSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    draft: portfolioContentSchema,
    published: portfolioContentSchema,
    lastPublishedAt: {
      type: Date,
      default: null,
    },
  },
  { versionKey: false, timestamps: true }
)
export const Portfolio = model('Portfolio', portfolioSchema)
