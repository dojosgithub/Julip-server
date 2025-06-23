import mongoose, { Schema, model } from 'mongoose'

export const brandSchema = new Schema(
  {
    name: { type: String },
    image: { type: String },
    url: { type: String },
  },
  { versionKey: false, timestamps: true }
)

export const Brand = model('Brand', brandSchema)
