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
    name: {
      type: String,
      required: true,
    },
    visibility: {
      type: Boolean, // Optional field
      default: true,
    },
    oneLiner: {
      type: String,
    },
    brandList: {
      type: Schema.Types.ObjectId,
      ref: 'Brand',
    },
  },
  audience: {
    name: {
      type: String,
    },
    visibility: {
      type: Boolean,
    },
    audienceList: {
      type: Schema.Types.ObjectId,
      ref: 'Audience',
    },
  },
  sample: {
    name: {
      type: String,
      required: true,
    },
    visibility: {
      type: Boolean,
      default: true,
    },

    categoryList: [{ type: Schema.Types.ObjectId, ref: 'Sample' }],
  },
  testimonials: {
    type: Schema.Types.ObjectId,
    ref: 'Testimonials',
  },
  contact: {
    name: {
      type: String,
      required: true,
    },
    visibility: {
      type: Boolean, // Optional field
      default: true,
    },
    contactList: {
      type: Schema.Types.ObjectId,
      ref: 'Contact',
    },
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
