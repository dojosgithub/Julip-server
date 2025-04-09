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
        ref: 'Product',
      },
    ],
    visibility: {
      type: Boolean,
      default: false,
    },
  },
  visibility: {
    type: Boolean,
    default: false,
  },
}

export const shopSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    draft: shopContentSchema,
    published: shopContentSchema,
    lastPublishedAt: {
      type: Date,
      default: null,
    },
  },
  { versionKey: false, timestamps: true }
)
export const Shop = model('Shop', shopSchema)
