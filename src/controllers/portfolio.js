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
import { Pages, Portfolio, Product, Shop, User } from '../models'

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
import { getInstagramFollowers } from '../utils/insta-acc-funcs'

const { ObjectId } = mongoose.Types

// const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
// const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
// const REDIRECT_URI = 'http://localhost:3000/api/user/auth/google/callback'

export const CONTROLLER_PORTFOLIO = {
  createAndUpdatePortfolio: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded
    const { name, speciality, brand, audience, sample, testimonials, contact, visibility } = req.body
    const { version = 'draft' } = req.query

    const user = await User.findById(userId)
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'User not found.',
      })
    }

    const portfolioData = {
      name,
      speciality,
      brand,
      audience,
      sample,
      testimonials,
      contact,
      visibility,
    }

    let portfolio = await Portfolio.findOne({ userId })

    if (!portfolio) {
      // Create a new portfolio if it doesn't exist
      portfolio = new Portfolio({
        userId,
        draft: portfolioData,
        published: portfolioData,
        lastPublishedAt: Date.now(),
      })
      await portfolio.save()
      user.portfolio = portfolio._id
      await user.save()
    } else {
      // Update the existing portfolio
      if (version === 'draft') {
        portfolio.draft = portfolioData
      } else if (version === 'published') {
        portfolio.published = portfolioData
      }
      portfolio.lastPublishedAt = Date.now()
      await portfolio.save()
    }

    const { draft, published, ...restPortfolio } = portfolio.toObject()
    let modifiedPortfolio

    if (version === 'draft') {
      modifiedPortfolio = {
        ...restPortfolio,
        ...draft,
      }
    } else if (version === 'published') {
      modifiedPortfolio = {
        ...restPortfolio,
        ...published,
      }
    }
    const findPages = await Pages.find({ user: userId })
    if (!findPages) {
      // If no existing page, create a new one
      const newPage = new Pages({
        user: userId,
        portfolio: portfolio._id,
      })

      await newPage.save() // Save the new page
      res.status(201).json({ message: 'Page created successfully', data: newPage })
    } else {
      // If page exists, update it
      Pages.findOneAndUpdate(
        { user: userId }, // Find criteria
        { portfolio: portfolio._id }, // Update data
        { new: true } // Return updated document
      )
    }

    res.status(StatusCodes.OK).json({
      data: modifiedPortfolio,
      message: portfolio.isNew ? 'Shop created successfully.' : 'Shop updated successfully.',
    })
  }),

  getPortfolio: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded
    const { version = 'draft' } = req.query // 'draft' or 'published'

    // Fetch and populate the portfolio data
    const portfolio = await Portfolio.findOne({ userId }).populate([
      { path: `${version}.brand.brandList`, model: 'Brand' },
      { path: `${version}.audience.audienceList`, model: 'Audience' },
      { path: `${version}.sample.categoryList`, model: 'Sample' },
      { path: `${version}.testimonials`, model: 'Testimonials' },
      { path: `${version}.contact.contactList`, model: 'Contact' },
    ])

    if (!portfolio) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Portfolio not found.',
      })
    }

    // Convert the Mongoose document to a plain object
    const portfolioPlain = portfolio.toObject()

    res.status(StatusCodes.OK).json({
      data: portfolioPlain,
      message: 'Portfolio retrieved successfully.',
    })
  }),

  updatePortfolio: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded
    const { version = 'draft' } = req.query // 'draft' or 'published'
    const { name, speciality, brand, audience, sample, testimonials, contact, visibility } = req.body

    // Construct the update object dynamically based on the version
    const updatePath = `${version}`
    const updateData = {
      [`${updatePath}.name`]: name,
      [`${updatePath}.speciality`]: speciality,
      [`${updatePath}.audience`]: audience,
      [`${updatePath}.sample`]: sample,
      [`${updatePath}.testimonials`]: testimonials,
      [`${updatePath}.contact`]: contact,
      [`${updatePath}.visibility`]: visibility,
    }

    // Update nested fields within the brand object
    if (brand) {
      updateData[`${updatePath}.brand.name`] = brand.name
      updateData[`${updatePath}.brand.visibility`] = brand.visibility
      updateData[`${updatePath}.brand.oneLiner`] = brand.oneLiner
      updateData[`${updatePath}.brand.brandList`] = brand.brandList || []
    }

    // Find and update the portfolio
    let portfolio = await Portfolio.findOneAndUpdate({ userId }, { $set: updateData }, { new: true, lean: true })

    if (!portfolio) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Portfolio not found.',
      })
    }

    res.status(StatusCodes.OK).json({
      data: portfolio,
      message: 'Portfolio updated successfully.',
    })
  }),
  fbSocialCallback: asyncMiddleware(async (req, res) => {
    const { code } = req.query
    try {
      const tokenResponse = await axios.post(`https://api.instagram.com/oauth/access_token`, {
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: process.env.REDIRECT_URI,
        code,
      })
      const { access_token, user_id } = tokenResponse.data
      res.json({ access_token, user_id })
    } catch (error) {
      res.status(500).send('Error fetching access token')
    }
    res.status(StatusCodes.OK).json({
      message: 'hoo gaya successfully.',
    })
  }),
  fbSocialAccessToken: asyncMiddleware(async (req, res) => {
    const { code } = req.query
    console.log('CLIENT_ID:', process.env.CLIENT_ID)
    console.log('CLIENT_SECRET:', process.env.CLIENT_SECRET)
    console.log('REDIRECT_URI:', process.env.REDIRECT_URI)
    try {
      const params = new URLSearchParams()
      params.append('client_id', process.env.CLIENT_ID)
      params.append('client_secret', process.env.CLIENT_SECRET)
      params.append('grant_type', 'authorization_code')
      params.append('redirect_uri', process.env.REDIRECT_URI)
      params.append('code', code)

      const response = await axios.post('https://api.instagram.com/oauth/access_token', params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })

      const { access_token, user_id } = response.data
      // const followers = await getInstagramFollowers(user_id, access_token)
      if (access_token && user_id) {
        const response = await axios.get(
          `https://graph.instagram.com/${user_id}?fields=followers_count&access_token=${access_token}`
        )
        console.log('follllllllllllll', response)
      }
      res.json({ data: response.data })
    } catch (error) {
      console.error('ttttttttttt', error)
      res.status(500).json({ error, message: 'Error during authentication' })
    }
  }),
  fbDetails: asyncMiddleware(async (req, res) => {
    const { user_id, access_token } = req.body
    try {
      const followers_response = await axios.get(
        `https://graph.instagram.com/${user_id}?fields=followers_count&access_token=${access_token}`
      )
      const reach = await axios.get(
        `https://graph.instagram.com/${user_id}/insights?metric=reach&period=days_28&access_token=${access_token}`
      )
      // const impressions = await axios.get(
      //   `https://graph.instagram.com/${user_id}/insights?metric=impressions&period=days_28&access_token=${access_token}`
      // )
      const media = await axios.get(
        `https://graph.instagram.com/${user_id}/media?fields=likes_count,comments_count,media_type,media_url,permalink&access_token=${access_token}`
      )
      res.status(StatusCodes.OK).json({
        followers: followers_response.data,
        reach: reach.data,
        // impressions: impressions.data.data[0].values[0].value,
        media: media.data.data,
      })
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: 'Error during authentication',
        error: error.message,
      })
    }
  }),
  fbSocialLongLiveAccessToken: asyncMiddleware(async (req, res) => {
    const { code } = req.query
    try {
      const response = await axios.get('https://graph.instagram.com/access_token', {
        params: {
          grant_type: 'ig_exchange_token',
          access_token: code,
          client_id: process.env.CLIENT_ID,
        },
      })
      console.log('Long-lived token:', response.data.access_token)
      res.json({ long_live_access_token: response.data.access_token })
    } catch (error) {
      res.status(500).send('Error during authentication')
    }
  }),
}
