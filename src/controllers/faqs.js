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

    // Create the FAQ
    const faqData = new Faq({ userId, question, answer, visibility })
    await faqData.save()

    // Find the services document for the user
    const services = await Services.findOne({ userId })

    if (!services) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Services not found for the user.',
      })
    }

    // Push the FAQ's _id into the appropriate version's faqs list
    if (version === 'draft') {
      services.draft.faqs.list.push(faqData._id)
    } else if (version === 'published') {
      services.published.faqs.list.push(faqData._id)
    } else {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Invalid version specified. Use "draft" or "published".',
      })
    }

    // Save the updated services document
    await services.save()

    // Respond with success
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
