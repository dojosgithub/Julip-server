import mongoose, { Schema, model } from 'mongoose'

export const faqSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    question: {
      type: String,
      required: true,
    },
    answer: {
      type: String,
      required: true,
    },
    visibility: {
      type: Boolean,
      default: true,
    },
  },
  { versionKey: false, timestamps: true }
)

export const Faq = model('Faq', faqSchema)
