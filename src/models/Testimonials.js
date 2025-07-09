import mongoose, { Schema, model } from 'mongoose'

export const testimonialSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    name: {
      type: String,
      required: true,
    },
    company: {
      type: String,
      required: false, // optional field
    },
    testimonial: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      required: true,
    },
    image: {
      type: String,
      required: false, // optional field
    },
    visibility: {
      type: Boolean,
      default: true,
    },
  },
  { versionKey: false, timestamps: true }
)

export const Testimonials = model('Testimonials', testimonialSchema)
