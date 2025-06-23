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
    location: {
      type: String,
      required: true,
    },
  },
  { versionKey: false, timestamps: true }
)

export const Speciality = model('Speciality', specialitySchema)
