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
import { Pages, Product, Shop, User } from '../models'

// * Middlewares
import { asyncMiddleware } from '../middlewares'

// * Services
import {
  addGroup,
  getGroupsPaginated,
  getGroupDetails,
  updateGroupDetails,
  getGroupMembersPaginated,
  createPost,
  getUserPostsPaginated,
  updatePost,
  getPostDetails,
  getgroupsPostsPaginated,
  getallPostsPaginated,
  getPostLike,
  getPostdisLike,
  createComment,
  updateComment,
  getAllComments,
  createExercise,
  getAllExercises,
  createBadge,
  getABadge,
  getAllBadge,
  updateBadge,
  createChallenge,
  updateChallenge,
  getAllZealAdminChallenges,
  getFriendsChallenges,
  getCommunityChallenges,
  getUserProgress,
  getUserExerciseLog,
  getChallengeHistory,
  getUserAllCurrentChallenges,
  getAllFeaturedChallenges,
  getUserCreatedChallenges,
  getSpecificCommunityChallenges,
  getAllPopularChallenges,
  getChallengeDetails,
  retrieveUserChallange,
  getAllExercisesCategory,
  getChallengeLeaderboard,
  getUsersPaginated,
} from '../services'

// * Utilities
import {
  DEALERSHIP_STATUS,
  DEALERSHIP_STAFF_ROLE,
  DOC_STATUS,
  getRoleByValue,
  getRoleShortName,
  USER_ROLE,
  USER_TYPES,
  AUCTION_STATUS,
  CAR_STATUS,
  SYSTEM_STAFF_ROLE,
  BID_STATUS,
  getCurrentDayName,
  getDateForDay,
  getStartOfDayISO,
  getDayName,
  CHALLENGE_STATUS,
} from '../utils/user'
import { getLoginLinkByEnv, getSanitizeCompanyName, toObjectId } from '../utils/misc'
import { stripe } from '../utils/stripe'
import Email from '../utils/email'
import { escapeRegex } from '../utils/misc'
import { comparePassword, generateOTToken, generatePassword, generateToken, verifyTOTPToken } from '../utils'
import { sendSMS } from '../utils/smsUtil'
import { getIO } from '../socket'

const { ObjectId } = mongoose.Types

// const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
// const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
// const REDIRECT_URI = 'http://localhost:3000/api/user/auth/google/callback'

export const CONTROLLER_SHOP = {
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
  updateShop: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded

    const { name, collections, pinnedProducts, visibility, version = 'draft' } = req.body
    if (!userId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'User ID is required.',
      })
    }
    let updatedShop
    const shopData = {
      name,
      collections,
      pinnedProducts,
      visibility,
    }

    if (pinnedProducts?.productsList?.length) {
      for (const item of pinnedProducts.productsList) {
        const { _id, ...updates } = item
        if (_id) {
          await Product.findByIdAndUpdate(_id, { $set: updates })
        }
      }
    }

    if (version === 'draft') {
      updatedShop = await Shop.findOneAndUpdate(
        { userId: userId },
        { draft: shopData, lastPublishedAt: Date.now() },
        { new: true }
      ).populate({
        path: 'draft.pinnedProducts.productsList',
        model: 'Product',
      })
    } else if (version === 'published') {
      updatedShop = await Shop.findOneAndUpdate(
        { userId: userId },
        { published: shopData, lastPublishedAt: Date.now() },
        { new: true }
      ).populate({
        path: 'published.pinnedProducts.productsList',
        model: 'Product',
      })
    }

    if (!updatedShop) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Shop not found.',
      })
    }
    const { draft, published, ...restShop } = updatedShop.toObject()
    let modifiedShop
    if (version === 'draft') {
      modifiedShop = {
        ...restShop,
        ...draft,
      }
    } else if (version === 'published') {
      modifiedShop = {
        ...restShop,
        ...published,
      }
    }

    res.status(StatusCodes.OK).json({
      data: modifiedShop,
      message: 'Shop updated successfully.',
    })
  }),
  createAndUpdateShop: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded
    const { name, collections, pinnedProducts, visibility } = req.body
    const { version = 'draft' } = req.query

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

    let shop = await Shop.findOne({ userId })

    if (!shop) {
      // Create a new shop if it doesn't exist
      shop = new Shop({
        userId,
        draft: shopData,
        published: shopData,
        lastPublishedAt: Date.now(),
      })
      await shop.save()
      user.shop = shop._id
      await user.save()
    } else {
      // Update the existing shop
      if (version === 'draft') {
        shop.draft = shopData
      } else if (version === 'published') {
        shop.published = shopData
      }
      shop.lastPublishedAt = Date.now()
      await shop.save()
    }

    const { draft, published, ...restShop } = shop.toObject()
    let modifiedShop

    if (version === 'draft') {
      modifiedShop = {
        ...restShop,
        ...draft,
      }
    } else if (version === 'published') {
      modifiedShop = {
        ...restShop,
        ...published,
      }
    }
    const findPages = await Pages.find({ user: userId })
    if (!findPages) {
      // If no existing page, create a new one
      const newPage = new Pages({
        user: userId,
        shop: shop._id,
      })

      await newPage.save() // Save the new page
      res.status(201).json({ message: 'Page created successfully', data: newPage })
    } else {
      // If page exists, update it
      Pages.findOneAndUpdate(
        { user: userId }, // Find criteria
        { shop: shop._id }, // Update data
        { new: true } // Return updated document
      )
    }

    res.status(StatusCodes.OK).json({
      data: modifiedShop,
      message: shop.isNew ? 'Shop created successfully.' : 'Shop updated successfully.',
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
    const { version = 'draft' } = req.query

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
      data: user.shop[version].collections,
      message: 'Collection retrieved successfully.',
    })
  }),

  getCollectionDetials: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded // Extract user ID from the decoded token
    const { collectionName } = req.params // Extract collection name from the URL parameters
    const { version = 'draft' } = req.query // Default to 'draft' version if not specified

    // Find the user's shop
    const shop = await Shop.findOne({ userId }).populate({
      path: `${version}.collections.products`, // Populate products in the specified version's collections
      model: 'Product',
    })

    if (!shop) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Shop not found.',
      })
    }

    // Find the specific collection by name
    const collection = shop[version].collections.find((col) => col.name.toLowerCase() === collectionName.toLowerCase())

    if (!collection) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Collection not found.',
      })
    }

    // Return the collection details along with its products
    res.status(StatusCodes.OK).json({
      data: collection,
      message: 'Collection retrieved successfully.',
    })
  }),
  createCollection: async (req, res) => {
    const { _id: userId } = req.decoded // User ID from token
    const { collectionName, products } = req.body // Collection name and product IDs from request body
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
      products,
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
    const { newCollectionName, products, visibility } = req.body // Updates for the collection

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
    if (visibility !== undefined || visibility !== null) {
      collection.visibility = visibility // Update the visibility of the collection (if provided)
    }
    // Save the updated shop document
    await shop.save()

    return res.status(200).json({
      success: true,
      message: 'Collection updated successfully.',
      data: collection,
    })
  },
  updateSingleProductCollection: async (req, res) => {
    const { _id: userId } = req.decoded // User ID from token
    const { version = 'draft', collectionName } = req.query // Collection name to edit
    const { newCollectionName, products } = req.body // Updates for the collection

    // Find the user's shop
    let shop = await Shop.findOne({ userId }).populate({
      path: `${version}.collections.products`,
      model: 'Product',
    })

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
    if (products) {
      if (mongoose.Types.ObjectId.isValid(products)) {
        collection.products.push(new mongoose.Types.ObjectId(products)) // Convert to ObjectId before pushing
      }
    }

    // Save the updated shop document
    await shop.save()

    // **Repopulate the products after saving**
    shop = await Shop.findOne({ userId }).populate({
      path: `${version}.collections.products`,
      model: 'Product',
    })

    // Return the updated collection with fresh populated data
    return res.status(200).json({
      success: true,
      message: 'Collection updated successfully.',
      data: shop[version].collections.find(
        (col) => col.name.toLowerCase() === (newCollectionName || collectionName).toLowerCase()
      ),
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
  getPinnedList: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded
    const { version = 'draft' } = req.query

    const user = await User.findById(userId).populate({
      path: 'shop',
      populate: [
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
      data: user.shop[version].pinnedProducts.productsList,
      message: 'Collection retrieved successfully.',
    })
  }),

  updatePinnedProducts: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded
    const { version = 'draft' } = req.query
    const { name, productsList, visibility } = req.body

    // Validate version
    if (!['draft', 'published'].includes(version)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Invalid version. Choose either "draft" or "published".',
      })
    }

    // Validate productsList
    if (productsList && !Array.isArray(productsList)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'productsList must be an array of product objects.',
      })
    }

    // Validate visibility
    if (visibility !== undefined && typeof visibility !== 'boolean') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'visibility must be a boolean value.',
      })
    }

    // Find the shop
    const shop = await Shop.findOne({ userId })
    if (!shop) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Shop not found.',
      })
    }

    // Update pinnedProducts fields if provided
    if (name) {
      shop[version].pinnedProducts.name = name
    }

    if (productsList) {
      shop[version].pinnedProducts.productsList = productsList

      // Update each product's pinnedProductVisibility in the Product model
      await Promise.all(
        productsList.map(async (product) => {
          const { _id, pinnedProductVisibility } = product
          if (_id) {
            await Product.findByIdAndUpdate(_id, { pinnedProductVisibility })
          }
        })
      )
    }

    if (visibility !== undefined) {
      shop[version].pinnedProducts.visibility = visibility
    }

    // Save the updated shop document
    await shop.save()

    // Populate the productsList with actual product details
    const populatedProducts = await Product.find({
      _id: { $in: shop[version].pinnedProducts.productsList },
    })

    // Return the response with populated product details
    res.status(StatusCodes.OK).json({
      data: {
        name: shop[version].pinnedProducts.name,
        visibility: shop[version].pinnedProducts.visibility,
        productsList: populatedProducts, // Populated product details
      },
      message: 'Pinned products updated successfully.',
    })
  }),
}
