// * Libraries
import { StatusCodes } from 'http-status-codes'
import { isEmpty, isUndefined, concat, cloneDeep } from 'lodash'
import speakeasy, { totp } from 'speakeasy'
import mongoose, { model } from 'mongoose'
const axios = require('axios')
import passport from 'passport'
import dotenv from 'dotenv'

dotenv.config()

// * Models
import { Product, Services, Shop, User } from '../models'

// * Middlewares
import { asyncMiddleware } from '../middlewares'

export const CONTROLLER_SERVICES = {
  createShop: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded
    const { name, collections, pinnedProducts, visibility } = req.body

    if (!name) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Shop name is required.',
      })
    }
    const user = await User.findById(userId)

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'User not found.',
      })
    }
    const shopData = {
      name,
      collections,
      pinnedProducts,
      visibility,
      userId,
    }
    const shop = new Shop({ userId, draft: shopData, published: shopData, lastPublishedAt: Date.now() })
    await shop.save()
    user.shop = shop._id
    await user.save()

    const { draft, published, ...restShop } = shop.toObject()
    let modifiedShop

    modifiedShop = {
      ...restShop,
      ...draft,
    }

    res.status(StatusCodes.CREATED).json({
      data: modifiedShop,
      message: 'Shop created successfully.',
    })
  }),

  // Update a shop
  updateServices: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded
    const { collections, Faqs, testimonials, visibility } = req.body
    const { version = 'draft' } = req.body

    if (!userId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'User ID is required.',
      })
    }

    const serviceData = {
      collections,
      Faqs,
      testimonials,
      visibility,
    }

    const services = await User.findById(userId).populate('services')

    if (!services) {
      services = new Services({ userId, draft: serviceData, published: serviceData, lastPublishedAt: Date.now() })
    }
    let updatedServices
    if (version === 'draft' && services) {
      updatedServices = await Services.findOneAndUpdate(
        { userId: userId },
        { draft: serviceData, lastPublishedAt: Date.now() },
        { new: true }
      )
    } else if (version === 'published' && services) {
      updatedServices = await Services.findOneAndUpdate(
        { userId: userId },
        { published: serviceData, lastPublishedAt: Date.now() },
        { new: true }
      )
    }

    if (!updatedServices) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Shop not found.',
      })
    }
    const { draft, published, ...restShop } = updatedServices.toObject()
    let modifiedServices
    if (version === 'draft') {
      modifiedServices = {
        ...restShop,
        ...draft,
      }
    } else if (version === 'published') {
      modifiedServices = {
        ...restShop,
        ...published,
      }
    }

    res.status(StatusCodes.OK).json({
      data: modifiedServices,
      message: 'Shop updated successfully.',
    })
  }),

  // Delete a shop
  deleteShop: asyncMiddleware(async (req, res) => {
    const { id } = req.query

    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Shop ID is required.',
      })
    }

    const deletedShop = await Shop.findByIdAndDelete(id)

    if (!deletedShop) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Shop not found.',
      })
    }

    res.status(StatusCodes.OK).json({
      message: 'Shop deleted successfully.',
    })
  }),

  // Get All shops
  getAllShops: asyncMiddleware(async (req, res) => {
    const shops = await Shop.find().populate({
      path: 'draft.collections.products',
      model: 'Product',
    })

    res.status(StatusCodes.OK).json({
      data: shops,
      message: 'Shops retrieved successfully.',
    })
  }),

  getShop: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded
    const { version = 'draft' } = req.query // 'draft' or 'published'

    // Fetch the user along with the shop data
    const user = await User.findById(userId).populate({
      path: 'shop',
      populate: [
        {
          path: `${version}.collections.products`, // Populate products in collections for the requested version
          model: 'Product',
        },
        {
          path: `${version}.pinnedProducts.productsList`, // Populate pinned products for the requested version
          model: 'Product',
        },
      ],
    })

    if (!user || !user.shop) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Shop not found.',
      })
    }

    const shopData = user.shop[version] // Access draft or published version of the shop

    res.status(StatusCodes.OK).json({
      data: {
        ...shopData,
        lastPublishedAt: user.shop.lastPublishedAt,
      },
      message: 'Shop retrieved successfully.',
    })
  }),

  getCollections: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded
    const { version = 'draft' } = req.params

    const user = await User.findById(userId).populate({
      path: 'shop',
      populate: [
        {
          path: `${version}.collections.products`,
          model: 'Product',
        },
        {
          path: `${version}.pinnedProducts.productsList`,
          model: 'Product',
        },
      ],
    })

    if (!user || !user.shop) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Shop not found.',
      })
    }

    res.status(StatusCodes.OK).json({
      data: user.shop[version],
      message: 'Collection retrieved successfully.',
    })
  }),

  createCollection: async (req, res) => {
    const { _id: userId } = req.decoded // User ID from token
    const { collectionName, productIds } = req.body // Collection name and product IDs from request body
    const { version = 'draft' } = req.query
    // Find the user's shop
    const shop = await Shop.findOne({ userId })

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found.',
      })
    }

    // Check if the collection name already exists
    const isCollectionExists = shop[version].collections.some(
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
      products: productIds, // Assume `productIds` is an array of ObjectIds
    }

    shop[version].collections.push(newCollection)

    // Save the updated shop document
    await shop.save()

    return res.status(201).json({
      success: true,
      message: 'Collection added successfully.',
      data: shop[version].collections,
    })
  },

  updateCollection: async (req, res) => {
    const { _id: userId } = req.decoded // User ID from token
    const { version = 'draft', collectionName } = req.query // Collection name to edit
    const { newCollectionName, products } = req.body // Updates for the collection

    // Find the user's shop
    const shop = await Shop.findOne({ userId })

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found.',
      })
    }

    // Locate the collection to edit
    const collection = shop[version].collections.find((col) => col.name.toLowerCase() === collectionName.toLowerCase())

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found.',
      })
    }

    // Check if the new collection name already exists (if it's being updated)
    if (newCollectionName && newCollectionName.toLowerCase() !== collectionName.toLowerCase()) {
      const isDuplicate = shop[version].collections.some(
        (col) => col.name.toLowerCase() === newCollectionName.toLowerCase()
      )
      if (isDuplicate) {
        return res.status(400).json({
          success: false,
          message: 'A collection with the new name already exists.',
        })
      }
      collection.name = newCollectionName // Update the collection name
    }

    // Update the products in the collection (if provided)
    if (products && Array.isArray(products)) {
      collection.products = products
    }

    // Save the updated shop document
    await shop.save()

    return res.status(200).json({
      success: true,
      message: 'Collection updated successfully.',
      data: collection,
    })
  },
  deleteCollection: async (req, res) => {
    const { _id: userId } = req.decoded // Extract user ID from token
    const { collectionName } = req.params // Extract collection name from URL
    const { version = 'draft' } = req.query
    // Find the shop for the user
    const shop = await Shop.findOne({ userId })

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found.',
      })
    }

    // Locate the collection to delete
    const collectionIndex = shop[version].collections.findIndex(
      (col) => col.name.toLowerCase() === collectionName.toLowerCase()
    )

    if (collectionIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found.',
      })
    }

    // Get the products from the collection
    const collection = shop[version].collections[collectionIndex]
    const productIds = collection.products

    // Delete the products from the database
    await Product.deleteMany({ _id: { $in: productIds } })

    // Remove the collection from the shop's[version]
    shop[version].collections.splice(collectionIndex, 1)

    // Save the updated shop document
    await shop.save()

    res.status(200).json({
      success: true,
      message: 'Collection and its products deleted successfully.',
    })
  },
}
