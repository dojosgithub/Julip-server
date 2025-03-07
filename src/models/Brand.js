import mongoose, { Schema, model } from 'mongoose'

export const specialitySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    visibility: {
      type: Boolean, // Optional field
      default: true,
    },
    oneLiner: {
      type: String,
    },
    brandList: [
      {
        name: { type: String },
        image: { type: String },
        url: { type: String },
      },
    ],
  },
  { versionKey: false, timestamps: true }
)

export const Speciality = model('Speciality', specialitySchema)
