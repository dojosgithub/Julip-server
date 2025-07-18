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
import { Product, Shop, User } from '../models'

// * Middlewares
import { asyncMiddleware } from '../middlewares'

const { ObjectId } = mongoose.Types

// const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
// const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
// const REDIRECT_URI = 'http://localhost:3000/api/user/auth/google/callback'

export const CONTROLLER_PRODUCT = {
  // Create a product
  createProduct: asyncMiddleware(async (req, res) => {
    // const { url, brandName, price, image, title, description, buttonTitle } = req.body
    const parsedbody = JSON.parse(req.body.body)
    let image
    const { url, brandName, price, title, currency, description, buttonTitle } = parsedbody
    image = parsedbody.image

    if (!url || !brandName || !price || !title || !description) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'All required fields must be provided.',
      })
    }
    // Add uploaded image if provided
    if (req.file) {
      image = req.file.path
    }
    const product = new Product({ url, brandName, price, image, title, currency, description, buttonTitle })
    await product.save()

    res.status(StatusCodes.CREATED).json({
      data: product,
      message: 'Product created successfully.',
    })
  }),

  // Update a product
  updateProduct: asyncMiddleware(async (req, res) => {
    const { id } = req.query
    let image
    const parsedbody = JSON.parse(req.body.body)
    const { url, brandName, price, currency, title, description, buttonTitle } = parsedbody
    image = parsedbody.image
    console.log('req.body', parsedbody)

    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Product ID is required.',
      })
    }

    if (req.file) {
      image = req.file.path
    }
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { url, brandName, price, image, currency, title, description, buttonTitle },
      { new: true }
    )
    console.log('updated product', updatedProduct)
    if (!updatedProduct) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Product not found.',
      })
    }

    res.status(StatusCodes.OK).json({
      data: updatedProduct,
      message: 'Product updated successfully.',
    })
  }),

  // Delete a product
  deleteProduct: asyncMiddleware(async (req, res) => {
    const { id } = req.query

    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Product ID is required.',
      })
    }

    const deletedProduct = await Product.findByIdAndDelete(id)

    if (!deletedProduct) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Product not found.',
      })
    }

    res.status(StatusCodes.OK).json({
      message: 'Product deleted successfully.',
    })
  }),

  // Get products
  getProducts: asyncMiddleware(async (req, res) => {
    const products = await Shop.find()

    res.status(StatusCodes.OK).json({
      data: products,
      message: 'Products retrieved successfully.',
    })
  }),

  getUserAllProducts: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded // Extract user ID from the decoded token
    const { version = 'draft' } = req.params // Default to 'draft' if version is not provided

    // Find the user and populate the shop with the specified version's collections and products
    const user = await User.findById(userId).populate({
      path: 'shop',
      populate: {
        path: `${version}.collections.products`, // Populate products in the specified version's collections
        model: 'Product',
      },
    })

    if (!user || !user.shop) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Shop not found.',
      })
    }

    // Access the collections from the specified version (draft or published)
    const collections = user.shop[version]?.collections || []

    // Flatten the products from all collections into a single array
    const allProducts = collections.flatMap((collection) => collection.products || [])

    res.status(StatusCodes.OK).json({
      data: allProducts,
      message: 'All products retrieved successfully.',
    })
  }),
  getFilteredProducts: async (req, res) => {
    const { _id: userId } = req.decoded
    const { title } = req.query

    const shop = await Shop.findOne({ userId }).populate({
      path: 'draft.collections.products',
      model: 'Product',
    })

    // Build the search query
    const query = {}
    if (title) query.title = { $regex: title, $options: 'i' } // Case-insensitive search
    // Fetch products based on the query
    const products = await Product.find(query)

    res.status(200).json({
      success: true,
      data: products,
    })
  },

  getProductsByCollection: async (req, res) => {
    const { _id: userId } = req.decoded // Get the user's ID from the token
    const { collectionName } = req.query // Collection name from URL params

    // Find the shop for the specific user and collection
    const shop = await Shop.findOne({
      userId, // Ensure it's for the specific user
      'draft.collections.name': collectionName, // Look for the collection in the draft version
    }).populate({
      path: 'draft.collections.products', // Populate products
    })

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Shop or collection not found.',
      })
    }

    // Get the collection matching the name
    const collection = shop.draft.collections.find((col) => col.name === collectionName)

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found in the shop.',
      })
    }

    res.status(200).json({
      success: true,
      data: collection.products,
      message: `Products from the collection "${collectionName}" retrieved successfully.`,
    })
  },
  cancelSubscriptionProduct: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded
    const { chosenProducts } = req.body // Array of product IDs the user wants to keep

    const chosenProductIds = chosenProducts.map((product) => product._id)
    if (!chosenProductIds || chosenProductIds.length > 5) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'You can only choose up to 5 products to keep.',
      })
    }

    // Find the user's shop and populate draft and published products
    const userShop = await Shop.findOne({ userId }).populate([
      { path: 'draft.collections.products', model: 'Product' },
      { path: 'published.collections.products', model: 'Product' },
    ])

    if (!userShop) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Shop not found.' })
    }
    // Access the collections from draft and published
    const draftCollections = userShop.draft?.collections || []
    const publishedCollections = userShop.published?.collections || []

    // Flatten the products from all collections into a single array
    const allDraftProducts = draftCollections.flatMap((collection) => collection.products || [])
    const allPublishedProducts = publishedCollections.flatMap((collection) => collection.products || [])

    // Helper function to prepare updates
    const prepareUpdates = (products) => {
      return products.map((product) => {
        if (chosenProductIds.includes(product._id.toString())) {
          return { _id: product._id, markedForDeletion: false, deletionTimestamp: null }
        } else {
          const deletionTimestamp = new Date()
          deletionTimestamp.setHours(deletionTimestamp.getHours() + 48) // Set to 48 hours from now
          return { _id: product._id, markedForDeletion: true, deletionTimestamp }
        }
      })
    }

    const draftProductsToUpdate = prepareUpdates(allDraftProducts)
    const publishedProductsToUpdate = prepareUpdates(allPublishedProducts)

    const allProductsToUpdate = [...draftProductsToUpdate, ...publishedProductsToUpdate]

    // Perform the bulk update
    await Product.bulkWrite(
      allProductsToUpdate.map((update) => ({
        updateOne: {
          filter: { _id: update._id },
          update: {
            $set: { markedForDeletion: update.markedForDeletion, deletionTimestamp: update.deletionTimestamp },
          },
        },
      }))
    )

    res.status(StatusCodes.OK).json({
      message: 'Subscription canceled. Selected products will be kept, others will be deleted after 48 hours.',
    })
  }),
  resubscribeProduct: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded

    // Find all products marked for deletion
    const productsToUpdate = await Product.find({ userId: new ObjectId(userId), markedForDeletion: true })

    // Update products to remove deletion mark
    await Product.updateMany(
      { _id: { $in: productsToUpdate.map((product) => product._id) } },
      { $set: { markedForDeletion: false, deletionTimestamp: null } }
    )

    res.status(StatusCodes.OK).json({
      message: 'Subscription resumed. Products marked for deletion have been saved.',
    })
  }),
}
