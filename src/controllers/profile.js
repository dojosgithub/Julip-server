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
import { User, Group, Challenge, Profile } from '../models'

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

export const CONTROLLER_PROFILE = {
  createProfile: asyncMiddleware(async (req, res) => {
    const body = await JSON.parse(req.body.body)
    const userId = body.userId

    if (!userId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'User ID is required.',
      })
    }

    // Mapping of platforms to their base URLs
    const platformBaseUrls = {
      Instagram: 'https://instagram.com/',
      TikTok: 'https://www.tiktok.com/@',
      YouTube: 'https://www.youtube.com/c/',
      Facebook: 'https://facebook.com/',
      Discord: 'https://discord.gg/',
      Threads: 'https://threads.net/',
      LinkedIn: 'https://linkedin.com/in/',
      Pinterest: 'https://pinterest.com/',
      Spotify: 'https://open.spotify.com/user/',
      Snapchat: 'https://www.snapchat.com/add/',
    }

    // Validate socialLinks
    if (body.socialLinks && Array.isArray(body.socialLinks)) {
      const invalidPlatform = body.socialLinks.find((link) => !platformBaseUrls[link.platform])

      if (invalidPlatform) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: `Invalid platform: ${invalidPlatform.platform}.`,
        })
      }

      body.socialLinks = body.socialLinks.map((link) => {
        const { platform, url, visibility } = link
        const baseUrl = platformBaseUrls[platform]
        return {
          platform,
          url: url.startsWith('http') ? url : `${baseUrl}${url}`,
          visibility,
        }
      })
    }

    // Validate webLinks
    if (body.webLinks && Array.isArray(body.webLinks)) {
      const invalidWebLink = body.webLinks.find((webLink) => !webLink.title || !webLink.link)

      if (invalidWebLink) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: 'Both title and link are required for all webLinks.',
        })
      }

      body.webLinks = body.webLinks.map((webLink) => {
        const { title, link, visibility } = webLink
        return {
          title,
          link: link.startsWith('http') ? link : `https://${link}`,
          visibility,
        }
      })
    }

    // Add uploaded image if provided
    if (req.file) {
      body.image = req.file.path
    }

    // Check if user exists
    const user = await User.findById(userId).exec()
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'User not found.',
      })
    }

    // Prepare profile data
    const profileData = {
      bio: body.bio,
      profileName: body.profileName,
      socialLinks: body.socialLinks,
      webLinks: body.webLinks,
      imageStyle: body.imageStyle,
      image: body.image,
      userId,
    }

    // Create new profile
    const profile = await Profile.create({ userId, draft: profileData, published: profileData })

    // Link profile to user
    user.profile = profile._id
    user.isProfileCreated = true
    await user.save()

    const { draft, published, ...restProfile } = profile.toObject()
    let modifiedProfile
    modifiedProfile = {
      ...restProfile,
      ...draft,
    }

    // Send response
    res.status(StatusCodes.CREATED).json({
      data: modifiedProfile,
      message: 'Profile created successfully.',
    })
  }),

  updateProfile: asyncMiddleware(async (req, res) => {
    const body = await JSON.parse(req.body.body)
    // const { version = 'published' } = req.query
    const id = body.userId
    const { version = 'draft' } = body
    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'User ID is required.',
      })
    }

    // Mapping of platforms to their base URLs
    const platformBaseUrls = {
      Instagram: 'https://instagram.com/',
      TikTok: 'https://www.tiktok.com/@',
      YouTube: 'https://www.youtube.com/c/',
      Facebook: 'https://facebook.com/',
      Discord: 'https://discord.gg/',
      Threads: 'https://threads.net/',
      LinkedIn: 'https://linkedin.com/in/',
      Pinterest: 'https://pinterest.com/',
      Spotify: 'https://open.spotify.com/user/',
      Snapchat: 'https://www.snapchat.com/add/',
    }

    // Validate and process socialLinks
    if (body.socialLinks && Array.isArray(body.socialLinks)) {
      // Check for missing or invalid platforms
      const invalidPlatform = body.socialLinks.find((link) => !link.platform || !platformBaseUrls[link.platform])

      if (invalidPlatform) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: `Invalid platform: ${invalidPlatform.platform || 'unknown'}.`,
        })
      }

      // Map validated socialLinks
      body.socialLinks = body.socialLinks.map((link) => {
        const { platform, url, username, visibility } = link
        const baseUrl = platformBaseUrls[platform]
        // Construct the full URL
        const fullUrl = url?.startsWith('http') ? url : `${baseUrl}${username.split('@')[1]}`

        return {
          platform,
          username, // Original input URL stored as `name`
          url: fullUrl, // Fully constructed URL
          visibility,
        }
      })
    }

    // Validate and process webLinks
    if (body.webLinks && Array.isArray(body.webLinks)) {
      const invalidWebLink = body.webLinks.find((webLink) => !webLink.title || !webLink.url)

      if (invalidWebLink) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: 'Both title and url are required for all webLinks.',
        })
      }

      // Map only after validation
      body.webLinks = body.webLinks.map((webLink) => {
        const { title, url, visibility } = webLink
        return {
          title,
          // url: url?.startsWith('http') ? url : `https://${url}`,
          url,
          visibility,
        }
      })
    }

    // Add uploaded image if provided
    if (req.file) {
      body.image = req.file.path
    }

    // Find user and check existence
    const user = await User.findById(id).populate('profile').exec()
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'User not found.',
      })
    }

    // Prepare profile data
    const profileData = {
      bio: body.bio,
      profileName: body.profileName,
      socialLinks: body.socialLinks,
      webLinks: body.webLinks,
      imageStyle: body.imageStyle,
      image: body.image,
    }
    if (!user.profile) {
      res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Could not find Profile.',
      })
    }
    let profile
    if (version === 'draft') {
      profile = await Profile.findByIdAndUpdate(
        user.profile._id,
        { draft: profileData, lastPublishedAt: Date.now() },
        {
          new: true,
        }
      )
    } else if (version === 'published') {
      profile = await Profile.findByIdAndUpdate(
        user.profile._id,
        { published: profileData, lastPublishedAt: Date.now() },
        {
          new: true,
        }
      )
    }

    const { draft, published, ...restProfile } = profile.toObject()
    let modifiedProfile
    if (version === 'draft') {
      modifiedProfile = {
        ...restProfile,
        ...draft,
      }
    } else if (version === 'published') {
      modifiedProfile = {
        ...restProfile,
        ...published,
      }
    }

    // Send response
    res.status(StatusCodes.OK).json({
      data: modifiedProfile,
      message: 'Profile updated successfully.',
    })
  }),

  getProfile: asyncMiddleware(async (req, res) => {
    const { _id: id } = req.decoded
    const { version = 'draft' } = req.query // 'draft' or 'published'

    const user = await User.findById(id).populate('profile').populate({
      path: 'profile',
      select: 'draft published', // Explicitly include draft and published fields
    })
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'User not found.',
      })
    }

    if (!user.profile) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Profile not found.',
      })
    }

    // Return the requested version
    const profileData = version === 'draft' ? user.profile.draft : user.profile.published
    res.status(StatusCodes.OK).json({
      data: {
        ...profileData,
        lastPublishedAt: user.profile.lastPublishedAt,
        isDraft: user.profile.isDraft,
      },
      message: 'Profile Details Successfully Fetched',
    })
  }),
}
