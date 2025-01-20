import { Schema, model } from 'mongoose'

const shopContentSchema = {
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
      products: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Product',
        },
      ],
    },
  ],
  pinnedProducts: {
    title: String,
    productsList: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Profile',
      },
    ],
  },
  visibility: {
    type: Boolean,
  },
}

// Updated profile schema with draft and published versions
export const shopSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    // Draft version of the profile
    draft: shopContentSchema,
    // Published version of the profile
    published: shopContentSchema,
    lastPublishedAt: {
      type: Date,
      default: null,
    },
  },
  { versionKey: false, timestamps: true }
)
export const Shop = model('Shop', shopSchema)
