import mongoose, { Schema, model } from 'mongoose'

export const contactSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    visibility: {
      type: Boolean, // Optional field
      default: true,
    },
    contactList: [
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
    ],
  },
  { versionKey: false, timestamps: true }
)

export const Contact = model('Contact', contactSchema)
