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

export const CONTROLLER_PRODUCT = {
  // Create a product
  createProduct: asyncMiddleware(async (req, res) => {
    const { url, brandName, price, image, title, description, buttonTitle } = req.body

    if (!url || !brandName || !price || !image || !title || !description) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'All required fields must be provided.',
      })
    }

    const product = new Product({ url, brandName, price, image, title, description, buttonTitle })
    await product.save()

    res.status(StatusCodes.CREATED).json({
      data: product,
      message: 'Product created successfully.',
    })
  }),

  // Update a product
  updateProduct: asyncMiddleware(async (req, res) => {
    const { id } = req.query
    const parsedbody = JSON.parse(req.body.body)
    const { url, brandName, price, image, title, description, buttonTitle } = parsedbody
    console.log('req.body', parsedbody)

    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Product ID is required.',
      })
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { url, brandName, price, image, title, description, buttonTitle },
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
    const { userId } = req.body
    console.log('first', userId, 'req', req.body)
    const user = await User.findById(userId).populate({
      path: 'shop',
      populate: {
        path: 'collections.products',
        model: 'Product', // Populating products in collections
      },
    })

    if (!user || !user.shop) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Shop not found.',
      })
    }

    const collections = user.shop.collections || []
    const allProducts = collections.flatMap((collection) => collection.products)

    res.status(StatusCodes.OK).json({
      data: allProducts,
      message: 'All products retrieved successfully.',
    })
  }),
}
