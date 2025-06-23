import mongoose, { Schema, model } from 'mongoose'

export const contactSchema = new Schema(
  {
    title: {
      type: String,
    },
    visibility: {
      type: Boolean,
    },
    url: {
      type: String,
    },
  },
  { versionKey: false, timestamps: true }
)

export const Contact = model('Contact', contactSchema)
