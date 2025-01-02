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
import { Shop, User } from '../models'

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
    const { name, collections, pinnedProducts, visibility, userId } = req.body

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

    const shop = new Shop({ name, collections, pinnedProducts, visibility })
    await shop.save()
    user.shop = shop._id
    await user.save()

    res.status(StatusCodes.CREATED).json({
      data: shop,
      message: 'Shop created successfully.',
    })
  }),

  // Update a shop
  updateShop: asyncMiddleware(async (req, res) => {
    const { id } = req.query
    const { name, collections, pinnedProducts, visibility } = req.body

    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Shop ID is required.',
      })
    }

    const updatedShop = await Shop.findByIdAndUpdate(
      id,
      { name, collections, pinnedProducts, visibility },
      { new: true }
    )

    if (!updatedShop) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Shop not found.',
      })
    }

    res.status(StatusCodes.OK).json({
      data: updatedShop,
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
      path: 'collections.products',
      model: 'Product',
    })

    res.status(StatusCodes.OK).json({
      data: shops,
      message: 'Shops retrieved successfully.',
    })
  }),

  getShop: asyncMiddleware(async (req, res) => {
    const { userId } = req.body

    const user = await User.findById(userId).populate({
      path: 'shop',
      populate: [
        {
          path: 'collections.products',
          model: 'Product', // Populating products in collections
        },
        {
          path: 'pinnedProducts.productsList',
          model: 'Product', // Populating products in pinnedProducts
        },
      ],
    })

    if (!user || !user.shop) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Shop not found.',
      })
    }

    console.log('Shop', user)

    res.status(StatusCodes.OK).json({
      data: user.shop,
      message: 'Shops retrieved successfully.',
    })
  }),
}
