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
    const { name, company, testimonial, rating, visibility } = body

    // Validate required fields
    if (!name || !testimonial || !rating) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'All required fields must be provided.',
      })
    }
    // Handle image upload
    let image
    if (req.file) {
      image = req.file.path
    }
    const testimonialData = new Testimonials({ userId, name, company, testimonial, rating, image, visibility })
    await testimonialData.save()
    const services = await Services.findOne({ userId })
    if (!services) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Services not found for the user.',
      })
    }
    services.draft.testimonials.list.push(testimonialData._id)
    await services.save()

    res.status(StatusCodes.CREATED).json({
      data: testimonialData,
      message: 'Testimonial created and added to Services successfully.',
    })
  }),

  // Update a Testimonial
  updateTestimonial: asyncMiddleware(async (req, res) => {
    const { id } = req.params
    const parsedbody = JSON.parse(req.body.body)
    const { name, company, testimonial, rating, visibility } = parsedbody
    let image

    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Testimonial ID is required.',
      })
    }

    if (req.file) {
      image = req.file.path
    } else {
      image = parsedbody.image
    }
    const updatedTestimonial = await Testimonials.findByIdAndUpdate(
      id,
      { name, company, testimonial, rating, image, visibility },
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
