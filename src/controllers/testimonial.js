// * Libraries
import { StatusCodes } from 'http-status-codes'
const axios = require('axios')
import passport from 'passport'
import dotenv from 'dotenv'

dotenv.config()

// * Models
import { Product, Services, Shop, Testimonials, User } from '../models'

// * Middlewares
import { asyncMiddleware } from '../middlewares'

export const CONTROLLER_TESTIMONIALS = {
  // Create a Testimonial
  createTestimonial: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded
    const body = await JSON.parse(req.body.body)
    const { name, testimonial, rating, visibility } = body
    let image
    if (!name || !testimonial || !rating) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'All required fields must be provided.',
      })
    }
    if (req.file) {
      image = req.file.path
    }
    const testimonialData = new Testimonials({ userId, name, testimonial, rating, image, visibility })
    await testimonialData.save()

    res.status(StatusCodes.CREATED).json({
      data: testimonialData,
      message: 'Testimonial created successfully.',
    })
  }),

  // Update a Testimonial
  updateTestimonial: asyncMiddleware(async (req, res) => {
    const { id } = req.params
    const parsedbody = JSON.parse(req.body.body)
    const { name, testimonial, rating, visibility } = parsedbody
    let image

    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Testimonial ID is required.',
      })
    }

    if (req.file) {
      image = req.file.path
    }
    const updatedTestimonial = await Testimonials.findByIdAndUpdate(
      id,
      { name, testimonial, rating, image, visibility },
      { new: true }
    )

    if (!updatedTestimonial) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Testimonial not found.',
      })
    }

    res.status(StatusCodes.OK).json({
      data: updatedTestimonial,
      message: 'Testimonial updated successfully.',
    })
  }),

  // Delete a Testimonial
  deleteTestimonial: asyncMiddleware(async (req, res) => {
    const { id } = req.params

    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Testimonial ID is required.',
      })
    }

    const deletedTestimonial = await Testimonials.findByIdAndDelete(id)

    if (!deletedTestimonial) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Testimonial not found.',
      })
    }

    res.status(StatusCodes.OK).json({
      message: 'Testimonial deleted successfully.',
    })
  }),

  // Get products
  getUserTestimonials: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded
    const testimonials = await Testimonials.find({ userId })

    res.status(StatusCodes.OK).json({
      data: testimonials,
      message: 'Testimonial retrieved successfully.',
    })
  }),
}
