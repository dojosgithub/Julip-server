// * Libraries
import { StatusCodes } from 'http-status-codes'
const axios = require('axios')
import passport from 'passport'
import dotenv from 'dotenv'

dotenv.config()

// * Models
import { Testimonials, Service, LandingPage, Services } from '../models'

// * Middlewares
import { asyncMiddleware } from '../middlewares'

export const CONTROLLER_SERVICES = {
  // Create a Service
  createService: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded
    const body = req.body
    const { title, description, price, time, timeUnit, currency, buttonTitle, buttonUrl, visibility } = body

    if (!title || !description || !buttonTitle || req.file) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'All required fields must be provided.',
      })
    }

    const serviceData = new Service({
      ...body,
      title,
      description,
      price,
      time,
      timeUnit,
      currency,
      buttonTitle,
      buttonUrl,
      visibility,
    })
    await serviceData.save()

    res.status(StatusCodes.CREATED).json({
      data: serviceData,
      message: 'Service created successfully.',
    })
  }),

  createLandingPage: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded
    const body = await JSON.parse(req.body.body)
    const {
      serviceId,
      landingPageName,
      time,
      timeUnit,
      currency,
      price,
      testimonials,
      recurrung,
      name,
      phoneNumber,
      instagram,
      isinstagramNumberRequired,
      isPhoneNumberRequired,
      buttonTitle,
      visibility,
    } = body
    let image
    if (
      !landingPageName ||
      !time ||
      !timeUnit ||
      !currency ||
      !price ||
      !testimonials ||
      !recurrung ||
      !name ||
      !phoneNumber ||
      !instagram ||
      !buttonTitle ||
      !req.file
    ) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'All required fields must be provided.',
      })
    }
    if (req.file) {
      image = req.file.path
    }
    const landingpage = new LandingPage({
      ...body,
      image,
    })
    const savedLandingPage = await landingpage.save()
    const service = await Service.findById(serviceId)
    service.landingPage = savedLandingPage._id
    service.save()

    res.status(StatusCodes.CREATED).json({
      data: service,
      message: 'Testimonial created successfully.',
    })
  }),

  // Update a Service
  updateService: asyncMiddleware(async (req, res) => {
    const { id } = req.params
    const body = req.body
    console.log('updateService', req.body)

    const { title, description, price, time, timeUnit, currency, buttonTitle, buttonUrl, visibility } = req.body

    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Service ID is required.',
      })
    }
    const find = await Service.findById(id)
    console.log('finding service', find)
    const updatedService = await Service.findByIdAndUpdate(
      id,
      {
        title,
        description,
        price,
        time,
        timeUnit,
        currency,
        buttonTitle,
        buttonUrl,
        visibility,
      },
      { new: true }
    )

    if (!updatedService) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Service not found.',
      })
    }

    res.status(StatusCodes.OK).json({
      data: updatedService,
      message: 'Service updated successfully.',
    })
  }),

  // Delete a Service
  deleteService: asyncMiddleware(async (req, res) => {
    const { id } = req.params

    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Service ID is required.',
      })
    }

    const deletedService = await Service.findByIdAndDelete(id)

    if (!deletedService) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Service not found.',
      })
    }

    res.status(StatusCodes.OK).json({
      message: 'Service deleted successfully.',
    })
  }),

  // Get Service
  getListUserService: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded
    const serviceList = await Service.find({ userId })

    res.status(StatusCodes.OK).json({
      data: serviceList,
      message: 'Service retrieved successfully.',
    })
  }),

  createAndupdateServices: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded
    const { id, version = 'draft' } = req.query
    const { name, collections, testimonials, faqs, visibility } = req.body

    if (!id) {
      if (!collections || !testimonials || !faqs) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: 'Collections, testimonials, and FAQs are required when ID is not provided.',
        })
      }
    }
    let servicesData
    if (!id) {
      servicesData = new Services({
        name,
        userId,
        draft: { collections, testimonials, faqs, visibility },
        published: { collections, testimonials, faqs, visibility },
      })
      await servicesData.save()
      res.status(StatusCodes.CREATED).json({
        data: servicesData,
        message: 'Services created successfully.',
      })
    } else {
      if (version === 'draft') {
        servicesData = await Services.findByIdAndUpdate(
          id,
          { draft: { collections, testimonials, faqs, visibility } },
          { new: true }
        )
      } else if (version === 'published') {
        servicesData = await Services.findByIdAndUpdate(
          id,
          { published: { collections, testimonials, faqs, visibility } },
          { new: true }
        )
      }
      res.status(StatusCodes.OK).json({
        data: servicesData,
        message: 'Services updated successfully.',
      })
    }
  }),
  getServices: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded
    const services = await Services.find({ userId })

    res.status(StatusCodes.OK).json({
      data: services,
      message: 'Services retrieved successfully.',
    })
  }),
}
