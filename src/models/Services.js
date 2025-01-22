import { Schema, model } from 'mongoose'

const serviceContentSchema = {
  name: {
    type: String,
    required: true,
  },
  collections: [
    {
      name: {
        type: String,
        required: true,
      },
      services: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Service',
        },
      ],
      visibility: {
        type: Boolean,
        default: true,
      },
    },
  ],
  testimonials: [
    {
      name: {
        type: String,
        required: true,
      },
      servicesObject: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Testimonials',
        },
      ],
      visibility: {
        type: Boolean,
        default: true,
      },
    },
  ],
  faqs: [
    {
      name: {
        type: String,
        required: true,
      },
      servicesObject: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Faq',
        },
      ],
      visibility: {
        type: Boolean,
      },
    },
  ],
  visibility: {
    type: Boolean,
    default: true,
  },
}

// Updated profile schema with draft and published versions
export const serviceSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    // Draft version of the profile
    draft: serviceContentSchema,
    // Published version of the profile
    published: serviceContentSchema,
    lastPublishedAt: {
      type: Date,
      default: null,
    },
  },
  { versionKey: false, timestamps: true }
)
export const Services = model('Services', serviceSchema)
