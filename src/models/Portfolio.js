import { Schema, model } from 'mongoose'

const portfolioContentSchema = {
  name: {
    type: String,
  },
  speciality: {
    name: {
      type: String,
      default: 'My Speciality',
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
      default: 'My Location',
    },
    visibility: {
      type: Boolean, // Optional field
      default: false,
    },
    location: {
      type: String,
      default: '',
    },
  },
  brand: {
    name: {
      type: String,
      default: "Brands I've Worked With",
    },
    visibility: {
      type: Boolean, // Optional field
      default: false,
    },
    oneLiner: {
      type: String,
      default: 'Click the logo to see my work',
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
      default: 'My Audience',
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
      default: 'Content Samples',
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
      default: 'Testimonials',
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
      default: 'Contact Me',
    },
    visibility: {
      type: Boolean, // Optional field
      default: false,
    },
    contactList: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Contact',
        default: [],
      },
    ],
    featuredContact: {
      type: Schema.Types.ObjectId,
      ref: 'Contact',
      default: null,
    },
  },
  componentOrder: {
    type: [String],
    default: ['speciality', 'location', 'brand', 'audience', 'sample', 'testimonials', 'contact'],
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
