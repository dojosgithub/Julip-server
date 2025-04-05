import { Schema, model } from 'mongoose'

const portfolioContentSchema = {
  name: {
    type: String,
  },
  speciality: {
    name: {
      type: String,
      default: 'speciality',
    },
    visibility: {
      type: Boolean, // Optional field
      default: false,
    },
    specialityList: [String],
  },
  location: {
    name: {
      type: String,
      default: 'location',
    },
    visibility: {
      type: Boolean, // Optional field
      default: false,
    },
    location: String,
  },
  brand: {
    name: {
      type: String,
      default: 'brand',
    },
    visibility: {
      type: Boolean, // Optional field
      default: false,
    },
    oneLiner: {
      type: String,
    },
    brandList: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Brand',
      },
    ],
  },
  audience: {
    name: {
      type: String,
    },
    visibility: {
      type: Boolean,
      default: false,
    },
    audienceList: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Audience',
      },
    ],
  },
  sample: {
    name: {
      type: String,
      default: 'sample',
    },
    visibility: {
      type: Boolean,
      default: false,
    },

    categoryList: [{ type: Schema.Types.ObjectId, ref: 'Sample' }],
  },
  testimonials: {
    name: {
      type: String,
      default: 'testimonials',
    },
    visibility: {
      type: Boolean,
      default: false,
    },

    testimonialList: [{ type: Schema.Types.ObjectId, ref: 'Testimonials' }],
  },
  contact: {
    name: {
      type: String,
      default: 'contact',
    },
    visibility: {
      type: Boolean, // Optional field
      default: false,
    },
    contactList: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Contact',
      },
    ],
    featuredContact: {
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
