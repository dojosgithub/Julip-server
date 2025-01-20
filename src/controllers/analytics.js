// * Libraries
import { StatusCodes } from 'http-status-codes'
import { isEmpty, isUndefined, concat, cloneDeep } from 'lodash'
import speakeasy, { totp } from 'speakeasy'
import mongoose, { model } from 'mongoose'
const axios = require('axios')
import passport from 'passport'
import dotenv from 'dotenv'
import { getGeolocation } from '../utils/geo-location'

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

const { ObjectId } = mongoose.Types

const calculatePercentages = (data, total) => {
  return Object.entries(data).reduce((acc, [key, value]) => {
    const percentage = ((value / total) * 100).toFixed(2) // Calculate percentage
    acc[key] = { count: value, percentage: `${percentage}%` } // Add count and percentage
    return acc
  }, {})
}

export const CONTROLLER_ANALYTICS = {
  // Increment webClicks count
  addWebClick: asyncMiddleware(async (req, res) => {
    const { userId, ip } = req.body // Assume IP is sent in the request body
    const location = await getGeolocation(ip)

    let analytics = await Analytics.findOne({ userId })

    if (!analytics) {
      analytics = new Analytics({ userId })
    }

    analytics.webClicks.push({
      timestamp: new Date(),
      location,
    })

    await analytics.save()

    res.status(StatusCodes.OK).json({
      message: 'Web click added successfully.',
      data: analytics.webClicks,
    })
  }),

  // Increment webViews count
  addWebView: asyncMiddleware(async (req, res) => {
    const { userId, ip } = req.body
    const location = await getGeolocation(ip)

    let analytics = await Analytics.findOne({ userId })

    if (!analytics) {
      analytics = new Analytics({ userId })
    }

    analytics.webViews.push({
      timestamp: new Date(),
      location,
    })

    await analytics.save()

    res.status(StatusCodes.OK).json({
      message: 'Web view added successfully.',
      data: analytics.webViews,
    })
  }),

  // Increment tabViews count for a specific tab
  addTabView: asyncMiddleware(async (req, res) => {
    const { userId, tabName } = req.body

    // Find or create the analytics document
    let analytics = await Analytics.findOne({ userId })
    if (!analytics) {
      analytics = new Analytics({ userId })
    }

    // Ensure tabViews map is initialized
    if (!analytics.tabViews) {
      analytics.tabViews = new Map()
    }

    // Check if the tabName exists and update or add it
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
      data: Object.fromEntries(analytics.tabViews), // Convert Map to plain object for response
    })
  }),

  // Increment product count for a specific product
  addProductClick: asyncMiddleware(async (req, res) => {
    const { userId, productName } = req.body

    let analytics = await Analytics.findOne({ userId })

    // Initialize the document if not found
    if (!analytics) {
      analytics = new Analytics({ userId })
    }

    // Check if the product already exists in the array
    const productIndex = analytics.products.findIndex((product) => product.productName === productName)

    if (productIndex === -1) {
      // If product doesn't exist, add it
      analytics.products.push({
        productName,
        count: 1,
        timestamp: new Date(),
      })
    } else {
      // If product exists, update its count and timestamp
      analytics.products[productIndex].count += 1
      analytics.products[productIndex].timestamp = new Date()
    }

    await analytics.save()

    res.status(StatusCodes.OK).json({
      message: 'Product click added successfully.',
      data: analytics.products, // Return the updated products array
    })
  }),

  // Get analytics for the last 7 days
  // Get analytics for the last 7 days
  getAnalyticsLast7Days: asyncMiddleware(async (req, res) => {
    const { userId } = req.body

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const analytics = await Analytics.findOne({ userId })

    if (!analytics) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'No analytics data found for the last 7 days.',
      })
    }

    // Filter webClicks and webViews within the last 7 days
    const webClicks = analytics.webClicks.filter(({ timestamp }) => new Date(timestamp) >= sevenDaysAgo)
    const webViews = analytics.webViews.filter(({ timestamp }) => new Date(timestamp) >= sevenDaysAgo)

    const totalWebClicks = webClicks.length
    const totalWebViews = webViews.length

    // Group and count webClicks by country
    const webClicksByCountryRaw = webClicks.reduce((acc, { location: { country } }) => {
      country = country || 'Unknown'
      acc[country] = (acc[country] || 0) + 1
      return acc
    }, {})

    // Group and count webViews by country
    const webViewsByCountryRaw = webViews.reduce((acc, { location: { country } }) => {
      country = country || 'Unknown'
      acc[country] = (acc[country] || 0) + 1
      return acc
    }, {})

    // Calculate percentages
    const webClicksByCountry = calculatePercentages(webClicksByCountryRaw, totalWebClicks)
    const webViewsByCountry = calculatePercentages(webViewsByCountryRaw, totalWebViews)

    // Convert Map to Array for tabViews
    const tabViews = Array.from(analytics.tabViews.entries())
      .filter(([key, value]) => new Date(value.timestamp) >= sevenDaysAgo)
      .sort((a, b) => b[1].count - a[1].count)

    // Prepare top 5 products
    const products = analytics.products
      .filter(({ timestamp }) => new Date(timestamp) >= sevenDaysAgo)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5) // Limit to top 5

    res.status(StatusCodes.OK).json({
      message: 'Analytics data for the last 7 days fetched successfully.',
      data: {
        webClicksByCountry,
        webViewsByCountry,
        webClicks: totalWebClicks, // Total click events
        webViews: totalWebViews, // Total view events
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

    const analytics = await Analytics.findOne({ userId })

    if (!analytics) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'No analytics data found for the last 14 days.',
      })
    }

    // Filter webClicks and webViews within the last 14 days
    const webClicks = analytics.webClicks.filter(({ timestamp }) => new Date(timestamp) >= fourteenDaysAgo)
    const webViews = analytics.webViews.filter(({ timestamp }) => new Date(timestamp) >= fourteenDaysAgo)

    const totalWebClicks = webClicks.length
    const totalWebViews = webViews.length

    // Group and count webClicks by country
    const webClicksByCountryRaw = webClicks.reduce((acc, { location: { country } }) => {
      country = country || 'Unknown'
      acc[country] = (acc[country] || 0) + 1
      return acc
    }, {})

    // Group and count webViews by country
    const webViewsByCountryRaw = webViews.reduce((acc, { location: { country } }) => {
      country = country || 'Unknown'
      acc[country] = (acc[country] || 0) + 1
      return acc
    }, {})

    // Calculate percentages
    const webClicksByCountry = calculatePercentages(webClicksByCountryRaw, totalWebClicks)
    const webViewsByCountry = calculatePercentages(webViewsByCountryRaw, totalWebViews)

    // Convert Map to Array for tabViews
    const tabViews = Array.from(analytics.tabViews.entries())
      .filter(([key, value]) => new Date(value.timestamp) >= fourteenDaysAgo)
      .sort((a, b) => b[1].count - a[1].count)

    // Prepare top 5 products
    const products = analytics.products
      .filter(({ timestamp }) => new Date(timestamp) >= fourteenDaysAgo)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5) // Limit to top 5

    res.status(StatusCodes.OK).json({
      message: 'Analytics data for the last 14 days fetched successfully.',
      data: {
        webClicksByCountry,
        webViewsByCountry,
        webClicks: totalWebClicks, // Total click events
        webViews: totalWebViews, // Total view events
        tabViews,
        products,
      },
    })
  }),
}
