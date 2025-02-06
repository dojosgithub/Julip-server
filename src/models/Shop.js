import { Schema, model } from 'mongoose'

const shopContentSchema = {
  name: {
    type: String,
  },
  collections: [
    {
      name: {
        type: String,
        required: true,
        unique: true,
      },
      products: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Product',
        },
      ],
      visibility: {
        type: Boolean,
        default: true,
      },
    },
  ],
  pinnedProducts: {
    name: {
      type: String,
      default: 'Pinned Product',
    },
    productsList: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Profile',
      },
    ],
    visibility: {
      type: Boolean,
      default: true,
    },
  },
  visibility: {
    type: Boolean,
    default: false,
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
