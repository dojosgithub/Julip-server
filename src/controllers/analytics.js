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
import {
  Analytics,
  User,
  TOTP,
  Group,
  Post,
  Comment,
  Badge,
  Challenge,
  UserChallengeProgress,
  Template,
} from '../models'

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

export const CONTROLLER_ANALYTICS = {
  // Increment webClicks count
  addWebClick: asyncMiddleware(async (req, res) => {
    // const { userId } = req.decoded
    const { userId } = req.body
    console.log('firstWebbbbbbb', userId)
    let analytics = await Analytics.findOne({ userId })

    if (!analytics) {
      analytics = new Analytics({ userId })
    }

    analytics.webClicks.count += 1
    analytics.webClicks.timestamp = new Date()

    await analytics.save()

    res.status(StatusCodes.OK).json({
      message: 'Web click added successfully.',
      data: analytics.webClicks,
    })
  }),

  // Increment webViews count
  addWebView: asyncMiddleware(async (req, res) => {
    const { userId } = req.body

    let analytics = await Analytics.findOne({ userId })

    if (!analytics) {
      analytics = new Analytics({ userId })
    }

    analytics.webViews.count += 1
    analytics.webViews.timestamp = new Date()

    await analytics.save()

    res.status(StatusCodes.OK).json({
      message: 'Web view added successfully.',
      data: analytics.webViews,
    })
  }),

  // Increment tabViews count for a specific tab
  addTabView: asyncMiddleware(async (req, res) => {
    const { userId, tabName } = req.body

    let analytics = await Analytics.findOne({ userId })

    if (!analytics) {
      analytics = new Analytics({ userId })
    }

    if (!analytics.tabViews.has(tabName)) {
      analytics.tabViews.set(tabName, { count: 1, timestamp: new Date() })
    } else {
      const tab = analytics.tabViews.get(tabName)
      tab.count += 1
      tab.timestamp = new Date()
      analytics.tabViews.set(tabName, tab)
    }

    await analytics.save()

    res.status(StatusCodes.OK).json({
      message: 'Tab view added successfully.',
      data: Object.fromEntries(analytics.tabViews), // Convert Map to object for easier frontend handling
    })
  }),

  // Increment product count for a specific product
  addProductClick: asyncMiddleware(async (req, res) => {
    const { userId, productName } = req.body

    let analytics = await Analytics.findOne({ userId })

    // Initialize the document if not found
    if (!analytics) {
      analytics = new Analytics({ userId, products: new Map() }) // Ensure products is initialized
    }

    // Ensure the products map is initialized
    if (!analytics.products) {
      analytics.products = new Map()
    }

    // Add or update product click count
    if (!analytics.products.has(productName)) {
      analytics.products.set(productName, { count: 1, timestamp: new Date() })
    } else {
      const product = analytics.products.get(productName)
      product.count += 1
      product.timestamp = new Date()
      analytics.products.set(productName, product)
    }

    await analytics.save()

    res.status(StatusCodes.OK).json({
      message: 'Product click added successfully.',
      data: Object.fromEntries(analytics.products), // Convert Map to object for easier frontend handling
    })
  }),

  // Get analytics for the last 7 days
  getAnalyticsLast7Days: asyncMiddleware(async (req, res) => {
    const { userId } = req.body

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const analytics = await Analytics.findOne({
      userId,
      $or: [{ 'webClicks.timestamp': { $gte: sevenDaysAgo } }, { 'webViews.timestamp': { $gte: sevenDaysAgo } }],
    })

    if (!analytics) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'No analytics data found for the last 7 days.',
      })
    }

    const tabViews = Object.fromEntries(
      Array.from(analytics.tabViews.entries()).filter(([, { timestamp }]) => new Date(timestamp) >= sevenDaysAgo)
    )

    const products = Object.fromEntries(
      Array.from(analytics.products.entries()).filter(([, { timestamp }]) => new Date(timestamp) >= sevenDaysAgo)
    )

    res.status(StatusCodes.OK).json({
      message: 'Analytics data for the last 7 days fetched successfully.',
      data: {
        webClicks: analytics.webClicks,
        webViews: analytics.webViews,
        tabViews,
        products,
      },
    })
  }),

  // Get analytics for the last 14 days
  getAnalyticsLast14Days: asyncMiddleware(async (req, res) => {
    const { userId } = req.body

    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

    const analytics = await Analytics.findOne({
      userId,
      $or: [{ 'webClicks.timestamp': { $gte: fourteenDaysAgo } }, { 'webViews.timestamp': { $gte: fourteenDaysAgo } }],
    })

    if (!analytics) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'No analytics data found for the last 14 days.',
      })
    }

    const tabViews = Object.fromEntries(
      Array.from(analytics.tabViews.entries()).filter(([, { timestamp }]) => new Date(timestamp) >= fourteenDaysAgo)
    )

    const products = Object.fromEntries(
      Array.from(analytics.products.entries()).filter(([, { timestamp }]) => new Date(timestamp) >= fourteenDaysAgo)
    )

    res.status(StatusCodes.OK).json({
      message: 'Analytics data for the last 14 days fetched successfully.',
      data: {
        webClicks: analytics.webClicks,
        webViews: analytics.webViews,
        tabViews,
        products,
      },
    })
  }),
}
