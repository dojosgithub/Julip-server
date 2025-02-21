// * Libraries
import { StatusCodes } from 'http-status-codes'
const axios = require('axios')
import passport from 'passport'
import dotenv from 'dotenv'

dotenv.config()

// * Models
import { Faq, Product, Services, Shop, Testimonials, User } from '../models'

// * Middlewares
import { asyncMiddleware } from '../middlewares'

export const CONTROLLER_FAQS = {
  // Create a Faq
  createFaq: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded
    const { question, answer, visibility } = req.body
    const { version = 'draft' } = req.query

    if (!(question, answer)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'All required fields must be provided.',
      })
    }

    const user = await User.findById(userId).populate('services')
    console.log('user[[[', user)
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'User not found.',
      })
    }

    const faqData = new Faq({ userId, question, answer, visibility })
    await faqData.save()
    const services = await Services.findOne({ userId })
    if (!services) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Services not found for the user.',
      })
    }
    services.draft.faqs.list.push(services._id)
    await services.save()

    res.status(StatusCodes.CREATED).json({
      data: faqData,
      message: 'FAQ created successfully.',
    })
  }),

  // Update a Faq
  updateFaq: asyncMiddleware(async (req, res) => {
    const { id } = req.params
    const { question, answer, visibility } = req.body

    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Faq ID is required.',
      })
    }

    const updatedFaq = await Faq.findByIdAndUpdate(id, { question, answer, visibility }, { new: true })
    if (!updatedFaq) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Faq not found.',
      })
    }

    res.status(StatusCodes.OK).json({
      data: updatedFaq,
      message: 'Faq updated successfully.',
    })
  }),

  // Delete a Faq
  deleteFaq: asyncMiddleware(async (req, res) => {
    const { id } = req.params

    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Faq ID is required.',
      })
    }

    const deletedFaq = await Faq.findByIdAndDelete(id)

    if (!deletedFaq) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Faq not found.',
      })
    }

    res.status(StatusCodes.OK).json({
      message: 'Faq deleted successfully.',
    })
  }),

  // Get products
  getUserFaqs: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded
    const faq = await Faq.find({ userId: userId })
    if (!faq) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Faqs not found.',
      })
    }
    res.status(StatusCodes.OK).json({
      data: faq,
      message: 'Testimonial retrieved successfully.',
    })
  }),
}
