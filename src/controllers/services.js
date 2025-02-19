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
import mongoose from 'mongoose'

export const CONTROLLER_SERVICES = {
  // Create a Service
  createService: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded
    const body = await JSON.parse(req.body.body)
    const { title, description, price, time, timeUnit, currency, buttonTitle, buttonUrl, visibility } = body

    if (!title || !description || !buttonTitle) {
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
      image: req.file ? req.file.path : null,
    })
    await serviceData.save()

    res.status(StatusCodes.CREATED).json({
      data: serviceData,
      message: 'Service created successfully.',
    })
  }),

  createLandingPage: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded

    // Parse the JSON payload
    let body
    try {
      body = JSON.parse(req.body.body)
    } catch (error) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Invalid JSON payload.',
      })
    }

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

    // Validate required fields
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

    // Handle image upload
    const image = req.file ? req.file.path : null

    try {
      // Create a new LandingPage document
      const landingPage = new LandingPage({
        ...body,
        image,
      })

      // Save the landing page to the database
      const savedLandingPage = await landingPage.save()

      // Update the associated service's landingPage reference
      const service = await Service.findById(serviceId)
      if (!service) {
        return res.status(StatusCodes.NOT_FOUND).json({
          message: 'Service not found.',
        })
      }

      service.landingPage = savedLandingPage._id
      await service.save()

      // Return the response
      res.status(StatusCodes.CREATED).json({
        data: savedLandingPage,
        message: 'Landing page created successfully.',
      })
    } catch (error) {
      console.error('Error creating landing page:', error)
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: 'An error occurred while creating the landing page.',
      })
    }
  }),

  updateLandingPage: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded
    const { id: landingPageId } = req.params // ID of the landing page to update

    // Parse the JSON payload
    let body
    try {
      body = JSON.parse(req.body.body)
    } catch (error) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Invalid JSON payload.',
      })
    }

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
    // Find the existing landing page
    const landingPage = await LandingPage.findOne({ _id: landingPageId })
    console.log('================================', landingPage)

    if (!landingPage) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Landing page not found.',
      })
    }

    // Validate required fields
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
      !buttonTitle
    ) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'All required fields must be provided.',
      })
    }

    // Update fields
    landingPage.landingPageName = landingPageName
    landingPage.time = time
    landingPage.timeUnit = timeUnit
    landingPage.currency = currency
    landingPage.price = price
    landingPage.testimonials = testimonials
    landingPage.recurrung = recurrung
    landingPage.name = name
    landingPage.phoneNumber = phoneNumber
    landingPage.instagram = instagram
    landingPage.isinstagramNumberRequired = isinstagramNumberRequired
    landingPage.isPhoneNumberRequired = isPhoneNumberRequired
    landingPage.buttonTitle = buttonTitle
    landingPage.visibility = visibility

    // Handle image upload
    if (req.file) {
      landingPage.image = req.file.path // Update the image path if a new file is uploaded
    }

    // Save the updated landing page
    const updatedLandingPage = await landingPage.save()

    // Update the associated service's landingPage reference if necessary
    // if (serviceId) {
    //   const service = await Service.findById(serviceId)
    //   if (service) {
    //     service.landingPage = updatedLandingPage._id
    //     await service.save()
    //   }
    // }

    res.status(StatusCodes.OK).json({
      data: updatedLandingPage,
      message: 'Landing page updated successfully.',
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
  updateSingleServiceCollection: async (req, res) => {
    const { _id: userId } = req.decoded // User ID from token
    const { version = 'draft' } = req.query // Collection version to edit
    const { serviceName, service } = req.body // Service name to match and service ID to add

    // Find the user's services
    let services = await Services.findOne({ userId }).populate({
      path: `${version}.collections.services`,
      model: 'Service',
    })

    if (!services) {
      return res.status(404).json({
        success: false,
        message: 'Services not found.',
      })
    }

    // Locate the collection to edit by matching the service name
    const collection = services[version].collections.find((col) => col.name.toLowerCase() === serviceName.toLowerCase())

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found.',
      })
    }

    // Add the service ID to the collection (if provided)
    if (service) {
      if (!mongoose.Types.ObjectId.isValid(service)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid service ID.',
        })
      }

      // Check if the service ID already exists in the collection
      if (collection.services.some((s) => s.equals(new mongoose.Types.ObjectId(service)))) {
        return res.status(400).json({
          success: false,
          message: 'Service already exists in the collection.',
        })
      }

      // Add the service ID to the collection
      collection.services.push(new mongoose.Types.ObjectId(service))
    }

    // Save the updated services document
    await services.save()

    // Repopulate the services after saving
    services = await Services.findOne({ userId }).populate({
      path: `${version}.collections.services`,
      model: 'Service',
    })

    // Return the updated collection with fresh populated data
    return res.status(200).json({
      success: true,
      message: 'Service added to the collection successfully.',
      data: services[version].collections.find((col) => col.name.toLowerCase() === serviceName.toLowerCase()),
    })
  },
  createCollection: async (req, res) => {
    const { _id: userId } = req.decoded // User ID from token
    const { collectionName, service } = req.body // Collection name and product IDs from request body
    const { version = 'draft' } = req.query
    // Find the user's services
    const services = await Services.findOne({ userId })

    if (!services) {
      return res.status(404).json({
        success: false,
        message: 'Services not found.',
      })
    }

    // Check if the collection name already exists
    const isCollectionExists = services[version].collections.some(
      (collection) => collection.name.toLowerCase() === collectionName.toLowerCase()
    )

    if (isCollectionExists) {
      return res.status(400).json({
        success: false,
        message: 'Collection name already exists.',
      })
    }

    // Add the new collection with the product IDs
    const newCollection = {
      name: collectionName,
      service,
    }

    services[version].collections.push(newCollection)

    // Save the updated services document
    await services.save()

    return res.status(201).json({
      success: true,
      message: 'Collection added successfully.',
      data: services[version].collections,
    })
  },
  deleteCollection: async (req, res) => {
    const { _id: userId } = req.decoded // User ID from token
    const { version = 'draft', collectionName } = req.query // Collection name to delete

    // Find the user's services
    const services = await Services.findOne({ userId })
    if (!services) {
      return res.status(404).json({
        success: false,
        message: 'Services not found.',
      })
    }

    // Locate the collection to delete
    const collectionIndex = services[version].collections.findIndex(
      (col) => col.name.toLowerCase() === collectionName.toLowerCase()
    )
    if (collectionIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found.',
      })
    }

    // Extract the services array from the collection
    const collection = services[version].collections[collectionIndex]
    const serviceIds = collection.services || [] // Array of service IDs

    // Delete the referenced Service documents
    if (serviceIds.length > 0) {
      await Service.deleteMany({ _id: { $in: serviceIds } })
    }

    // Remove the collection
    services[version].collections.splice(collectionIndex, 1)

    // Save the updated services document
    await services.save()

    // Return the remaining collections
    return res.status(200).json({
      success: true,
      message: 'Collection and associated services deleted successfully.',
      data: services[version].collections,
    })
  },
  getAllCollections: async (req, res) => {
    const { _id: userId } = req.decoded // User ID from token
    const { version = 'draft' } = req.query // Version to retrieve collections from

    // Find the user's services and populate the collections
    const services = await Services.findOne({ userId }).populate({
      path: `${version}.collections.services`,
      model: 'Service',
    })

    if (!services) {
      return res.status(404).json({
        success: false,
        message: 'Services not found.',
      })
    }

    // Return all collections for the specified version
    return res.status(200).json({
      success: true,
      message: 'Collections retrieved successfully.',
      data: services[version].collections,
    })
  },
}
