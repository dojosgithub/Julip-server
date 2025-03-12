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

    // Fetch the user along with the portfolio data
    const port = await User.findById(userId).populate('portfolio')

    const portfolio = await Portfolio.findOne({ userId }).populate([
      { path: `${version}.brand`, model: 'Brand' },
      { path: `${version}.audience`, model: 'Audience' },
      { path: `${version}.sample`, model: 'Sample' },
      { path: `${version}.testimonials`, model: 'Testimonials' },
      { path: `${version}.contact`, model: 'Contact' },
    ])
    if (!portfolio) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Portfolio not found.',
      })
    }

    res.status(StatusCodes.OK).json({
      data: {
        ...portfolio,
      },
      message: 'Portfolio retrieved successfully.',
    })
  }),

  updatePortfolio: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded
    const { version = 'draft' } = req.query // 'draft' or 'published'
    const { name, speciality, brand, audience, sample, testimonials, contact, visibility } = req.body
    let portfolio = await Portfolio.findOneAndUpdate(
      { userId },
      { name, speciality, brand, audience, sample, testimonials, contact, visibility },
      { new: true }
    )
    if (!portfolio) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Portfolio not found.',
      })
    }

    res.status(StatusCodes.OK).json({
      data: {
        ...portfolio,
      },
      message: 'Portfolio updated successfully.',
    })
  }),
}
