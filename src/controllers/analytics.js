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

    const updateQuery = {
      userId,
      'products.productName': productName,
    }

    const updateExistingProduct = {
      $inc: { 'products.$.count': 1 },
      $set: { 'products.$.timestamp': new Date() },
    }

    const updated = await Analytics.findOneAndUpdate(updateQuery, updateExistingProduct, {
      new: true,
    })

    if (updated) {
      return res.status(StatusCodes.OK).json({
        message: 'Product click updated successfully.',
        data: updated.products,
      })
    }

    // If product doesn't exist, push a new one
    const updateNewProduct = {
      $push: {
        products: {
          productName,
          count: 1,
          timestamp: new Date(),
        },
      },
    }

    const result = await Analytics.findOneAndUpdate({ userId }, updateNewProduct, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    })

    return res.status(StatusCodes.OK).json({
      message: 'Product click added successfully.',
      data: result.products,
    })
  }),

  // Get analytics for the last 7 days
  getAnalyticsLast7Days: asyncMiddleware(async (req, res) => {
    const { userId } = req.body
    const data = await getAnalyticsData(userId, 7)

    if (!data) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'No analytics data found for the last 7 days.' })
    }

    res.status(StatusCodes.OK).json({
      message: 'Analytics data for the last 7 days fetched successfully.',
      data,
    })
  }),

  getAnalyticsLast14Days: asyncMiddleware(async (req, res) => {
    const { userId } = req.body
    const data = await getAnalyticsData(userId, 14)

    if (!data) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'No analytics data found for the last 14 days.' })
    }

    res.status(StatusCodes.OK).json({
      message: 'Analytics data for the last 14 days fetched successfully.',
      data,
    })
  }),

  streamAnalytics: asyncMiddleware(async (req, res) => {
    const { userId, days } = req.query

    if (!userId) {
      return res.status(400).json({ message: 'Missing userId' })
    }

    // Setup headers for SSE
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    // Parse days in decimal base system
    const daysAgo = parseInt(days, 10) || 7
    let previousData = null

    const sendData = async () => {
      try {
        const current = await getAnalyticsData(userId, daysAgo)

        if (!current) return // Avoid sending null/undefined

        const serialized = JSON.stringify(current)
        if (serialized === previousData) return

        res.write(`data: ${serialized}\n\n`)
        previousData = serialized
      } catch (error) {
        console.error('Error sending SSE data:', error)
        res.write(`event: error\ndata: ${JSON.stringify({ message: 'Internal server error' })}\n\n`)
      }
    }

    // Initial send
    await sendData()

    // Keep sending every 10 seconds
    const interval = setInterval(sendData, 10000)

    // Cleanup on client disconnect
    req.on('close', () => {
      clearInterval(interval)
      res.end() // close the stream
      console.log(`SSE connection closed for userId: ${userId}`)
    })
  }),
}

export const getAnalyticsData = async (userId, daysAgo) => {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysAgo)

  const analytics = await Analytics.findOne({ userId })

  if (!analytics) {
    return {
      webClicksByCountry: {},
      webViewsByCountry: {},
      webClicks: 0,
      webViews: 0,
      tabViews: [],
      products: [],
    }
  }

  const webClicks = analytics.webClicks.filter(({ timestamp }) => new Date(timestamp) >= cutoffDate)
  const webViews = analytics.webViews.filter(({ timestamp }) => new Date(timestamp) >= cutoffDate)

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
    .filter(([_, value]) => new Date(value.timestamp) >= cutoffDate)
    .sort((a, b) => b[1].count - a[1].count)

  // Prepare top 5 products
  const products = analytics.products
    .filter(({ timestamp }) => new Date(timestamp) >= cutoffDate)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5) // Limit to top 5

  return {
    webClicksByCountry,
    webViewsByCountry,
    webClicks: totalWebClicks, // Total click events
    webViews: totalWebViews, // Total view events
    tabViews,
    products,
  }
}
