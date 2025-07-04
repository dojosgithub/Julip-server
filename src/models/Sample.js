import mongoose, { Schema, model } from 'mongoose'

export const sampleSchema = new Schema(
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
        visibility: { type: Boolean },
      },
    ],
  },
  { versionKey: false, timestamps: true }
)

export const Sample = model('Sample', sampleSchema)
