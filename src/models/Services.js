import { Schema, model } from 'mongoose'

const serviceContentSchema = {
  collections: [
    {
      name: {
        type: String,
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
  testimonials: {
    list: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Testimonials',
      },
    ],
    visibility: { type: Boolean, default: true },
  },
  faqs: {
    list: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Faq',
      },
    ],
    visibility: { type: Boolean, default: true },
  },
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
    name: {
      type: String,
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
