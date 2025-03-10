import mongoose, { Schema, model } from 'mongoose'

export const sampleSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    visibility: {
      type: Boolean,
      default: true,
    },
    categoryList: [
      {
        name: {
          type: String,
        },
        sampleList: [
          {
            url: {
              type: String,
            },
            tile: { type: String },
            buttonTitle: { type: String },
            visibility: { type: String },
          },
        ],
      },
    ],
  },
  { versionKey: false, timestamps: true }
)

export const Sample = model('Sample', sampleSchema)
