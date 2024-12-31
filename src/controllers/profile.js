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
  // ZEAL FITNESS APP APIS

  profile: asyncMiddleware(async (req, res) => {
    const { _id } = req.decoded
    const id = req.query.id
    // console.log('id', id)
    let userId
    if (id) {
      userId = id
    } else userId = _id

    const user = await User.findByIdAndUpdate(
      userId,
      { lastActive: new Date() }, // the update operation
      { new: true } // options for the update operation
    )
      .select('-password') // selecting fields to exclude
      .lean()

    if (!user)
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'User not found.',
      })

    res.status(StatusCodes.OK).json({
      data: {
        user,
      },
      message: 'Profiles Fetched Successfully',
    })
  }),

  updateProfile: asyncMiddleware(async (req, res) => {
    const id = req.query.id
    let body = JSON.parse(req.body.body)

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

    // Process socialLinks to prepend base URLs
    if (body.socialLinks && Array.isArray(body.socialLinks)) {
      body.socialLinks = body.socialLinks.map((link) => {
        const { platform, url } = link
        const baseUrl = platformBaseUrls[platform]

        if (!baseUrl) {
          return res.status(StatusCodes.BAD_REQUEST).json({
            message: 'User not found.',
          })
        }

        // Check if the provided URL is already a full URL
        const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`
        return { platform, url: fullUrl }
      })
    }

    // Validate and process webLinks
    if (body.webLinks && Array.isArray(body.webLinks)) {
      body.webLinks = body.webLinks.map((webLink) => {
        const { title, link } = webLink

        if (!title || !link) {
          return res.status(StatusCodes.BAD_REQUEST).json({
            message: 'Both title and link are required for webLinks.',
          })
        }

        // Check if the link is a valid URL (simple validation)
        const fullLink = link.startsWith('http') ? link : `https://${link}`
        return { title, link: fullLink }
      })
    }

    body = {
      avatar: req.file && req.file.path,
      ...body,
    }

    const user = await User.findById(id).populate('profile').exec()
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'User not found.',
      })
    }

    const profileData = {
      bio: body.bio,
      profileName: body.profileName,
      socialLinks: body.socialLinks,
      webLinks: body.webLinks,
      imageStyle: body.imageStyle,
    }

    let profile
    if (user.profile) {
      profile = await Profile.findByIdAndUpdate(user.profile._id, profileData, { new: true })
    } else {
      profile = await Profile.create(profileData)
      user.profile = profile._id
      await user.save()
    }

    res.status(StatusCodes.OK).json({
      data: profile,
      message: 'Profile updated Successfully',
    })
  }),

  getUser: asyncMiddleware(async (req, res) => {
    const id = req.query.id

    const user = await User.findById(id)
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'User not found.',
      })
    }
    res.status(StatusCodes.OK).json({
      data: user,
      message: 'User Details Successfully Fetched',
    })
  }),

  home: asyncMiddleware(async (req, res) => {
    const id = req.query.id

    const user = await User.findById(id).select('firstName lastName email file location')
    const popularGroups = await Group.aggregate([
      {
        $match: {
          $and: [{ groupMembers: { $nin: [ObjectId(id)] } }, { groupAdmin: { $nin: [ObjectId(id)] } }],
        },
      },
      {
        $addFields: {
          memberCount: { $size: '$groupMembers' },
        },
      },

      {
        $sort: {
          memberCount: -1,
        },
      },
      {
        $limit: 5,
      },
      {
        $project: {
          _id: 1,
          groupName: 1,
          files: 1,
          groupDescription: 1,
          groupMembers: 1,
        },
      },
    ])

    const zealChallenges = await Challenge.find({
      type: 'zeal',
      status: CHALLENGE_STATUS.LIV,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('image name exercise')

    const currentChallenges = await Challenge.find({
      user: id,
      status: CHALLENGE_STATUS.LIV,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('image name exercise')

    res.status(StatusCodes.OK).json({
      data: { user, popularGroups, zealChallenges, currentChallenges },
      message: 'home info fetched successfully',
    })
  }),

  userList: asyncMiddleware(async (req, res) => {
    const { _id } = req.decoded
    console.log('id', _id)
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10

    let searchQuery = {}

    const paginateOptions = {
      page,
      limit,
      // sort: { createdAt: -1 },
    }
    let ORqueryArray = []
    if (!isEmpty(req.query.query)) {
      const documentMatchKeys = ['firstName', 'lastName']
      ORqueryArray = documentMatchKeys.map((key) => ({
        [key]: { $regex: new RegExp(escapeRegex(req.query.query), 'gi') },
      }))

      searchQuery = {
        $and: [
          {
            $or: ORqueryArray,
          },
        ],
      }
    }

    res.status(StatusCodes.OK).json({
      data: list,
      message: 'User fetched successfully',
    })
  }),
}
