import mongoose, { Schema, model } from 'mongoose'
import { DOC_STATUS, USER_ROLE } from '../utils/user'
import crypto from 'crypto'
import Joi, { boolean } from 'joi'
import mongoosePaginate from 'mongoose-paginate-v2'
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2'

export const shopSchema = new Schema(
  {
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
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { versionKey: false, timestamps: true }
)

export const Shop = model('Shop', shopSchema)
