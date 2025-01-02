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
import { About } from '../models/About'

const { ObjectId } = mongoose.Types

// const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
// const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
// const REDIRECT_URI = 'http://localhost:3000/api/user/auth/google/callback'

export const CONTROLLER_ABOUT = {
  addAboutItems: asyncMiddleware(async (req, res) => {
    const { userId, items = [] } = req.body

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required.' })
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items array is required and must not be empty.' })
    }

    const validTypes = ['heading', 'description', 'image']

    // Validate and map items with sequence
    const processedItems = items.map((item, index) => {
      if (!item.type || !validTypes.includes(item.type)) {
        throw new Error(`Invalid item type: ${item.type}`)
      }
      if (item.type === 'image') {
        // Map the uploaded image to its corresponding item
        if (!req.files || !req.files[index]) {
          throw new Error('Image file is missing for an image item.')
        }
        return {
          type: 'image',
          value: req.files[index].path,
          visibility: item.visibility ?? true, // Default visibility if not provided
          sequence: item.sequence ?? index, // Use provided sequence or fallback to index
        }
      }
      if (!item.value) {
        throw new Error('Each item must have a value.')
      }
      if (typeof item.visibility !== 'boolean') {
        throw new Error('Each item must have a visibility property of true or false.')
      }
      return {
        ...item,
        sequence: item.sequence ?? index, // Ensure each item has a sequence
      }
    })

    const about = await About.findOne({ userId })

    if (!about) {
      const newAbout = new About({
        userId,
        items: processedItems,
      })
      await newAbout.save()
      return res.status(201).json({ data: newAbout, message: 'About section created successfully.' })
    }

    // Merge new items with existing ones
    about.items.push(...processedItems)

    // Sort items by sequence to maintain the desired order
    about.items.sort((a, b) => a.sequence - b.sequence)

    await about.save()

    res.status(200).json({ data: about, message: 'About section updated successfully.' })
  }),

  updateAboutItems: asyncMiddleware(async (req, res) => {
    const { userId, items = [] } = req.body

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required.' })
    }

    if (!Array.isArray(items)) {
      return res.status(400).json({ message: 'Items must be an array.' })
    }

    const validTypes = ['heading', 'description', 'image']

    // Process and validate items
    const processedItems = items.map((item, index) => {
      if (!item.type || !validTypes.includes(item.type)) {
        throw new Error(`Invalid item type: ${item.type}`)
      }

      if (!item.value) {
        throw new Error('Each item must have a value.')
      }

      if (typeof item.visibility !== 'boolean') {
        throw new Error('Each item must have a visibility property of true or false.')
      }

      // Ensure sequence is maintained or assigned
      return {
        ...item,
        sequence: item.sequence ?? index, // Use provided sequence or default to index
      }
    })

    const about = await About.findOne({ userId })

    if (!about) {
      return res.status(404).json({ message: 'About section not found for this user.' })
    }

    // Update the items array
    about.items = processedItems

    // Sort items by sequence to ensure the order is maintained
    about.items.sort((a, b) => a.sequence - b.sequence)

    await about.save()

    res.status(200).json({
      data: about,
      message: 'About section updated successfully.',
    })
  }),

  deleteAboutItems: asyncMiddleware(async (req, res) => {
    const { userId, itemIds = [] } = req.body

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required.' })
    }

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ message: 'Item IDs array is required and must not be empty.' })
    }

    const about = await About.findOne({ userId })

    if (!about) {
      return res.status(404).json({ message: 'About section not found.' })
    }

    // Remove items with matching IDs
    about.items = about.items.filter((item) => !itemIds.includes(item._id.toString()))

    await about.save()

    res.status(200).json({ data: about, message: 'About items deleted successfully.' })
  }),

  getAbout: asyncMiddleware(async (req, res) => {
    const { userId } = req.params

    const about = await About.findOne({ userId })

    if (!about) {
      return res.status(404).json({ message: 'About section not found.' })
    }

    res.status(200).json({ data: about.items })
  }),
}
