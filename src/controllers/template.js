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
import { User, TOTP, Group, Post, Comment, Badge, Challenge, UserChallengeProgress, Template } from '../models'

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

export const CONTROLLER_TEMPLATE = {
  createTemplate: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded
    const { name, mode, colors, fonts } = req.body

    // Validate required fields
    if (!name || isEmpty(colors) || isEmpty(colors?.light) || isEmpty(colors?.dark) || isEmpty(fonts)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Name, colors, and fonts are required.',
      })
    }

    // Create a new template
    const templateData = {
      name,
      mode: mode || 'light', // Default to 'light' mode if not provided
      colors,
      userId,
      fonts: {
        header: fonts.header,
        body: fonts.body,
      },
    }
    const template = new Template({
      userId,
      draft: templateData,
      published: templateData,
      lastPublishedAt: Date.now(),
    })

    const savedTemplate = await template.save()
    const user = await User.findById(userId)
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'User not found.',
      })
    }
    user.template = savedTemplate._id
    await user.save()

    const { draft, published, ...restTemplate } = template.toObject()
    const modifiedTemplate = {
      ...restTemplate,
      ...draft,
    }
    res.status(StatusCodes.CREATED).json({
      data: modifiedTemplate,
      message: 'Template created successfully.',
    })
  }),

  updateTemplate: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded
    const { name, mode, colors, fonts, version = 'draft' } = req.body

    // Validate user
    const user = await User.findById(userId)
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'User not found.',
      })
    }

    // Fetch the existing template
    const template = await Template.findById(user.template)
    if (!template) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Template not found.',
      })
    }

    // Merge the existing template data with the incoming data
    const existingData = version === 'draft' ? template.draft : template.published
    const updatedData = {
      name: name || existingData.name,
      mode: mode || existingData.mode,
      colors: colors || existingData.colors,
      fonts: fonts || existingData.fonts,
    }

    // Update the template
    const updateFields =
      version === 'draft'
        ? { draft: updatedData, lastPublishedAt: Date.now() }
        : { published: updatedData, lastPublishedAt: Date.now() }

    const updatedTemplate = await Template.findByIdAndUpdate(user.template, updateFields, { new: true })

    if (!updatedTemplate) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Template update failed.',
      })
    }

    // Format the response
    const { draft, published, ...restTemplate } = updatedTemplate.toObject()
    const modifiedTemplate = version === 'draft' ? { ...restTemplate, ...draft } : { ...restTemplate, ...published }

    res.status(StatusCodes.OK).json({
      data: modifiedTemplate,
      message: 'Template updated successfully.',
    })
  }),

  getTemplateList: asyncMiddleware(async (req, res) => {
    // Create a new template
    const templates = await Template.find()

    res.status(StatusCodes.OK).json({
      data: templates,
      message: 'Template list fetched successfully.',
    })
  }),
  getTemplate: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded
    const { version = 'draft' } = req.query

    // fetched the template
    const template = await Template.findOne({ userId })

    if (!template) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Template not found.',
      })
    }
    console.log('zxcvbn', template)
    const templateData = version === 'draft' ? template.draft : template.published

    res.status(StatusCodes.OK).json({
      data: templateData,
      message: 'Template fetched successfully.',
    })
  }),

  selectTemplate: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded
    const { templateId } = req.params

    if (!templateId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Template id not found.',
      })
    }
    const template = await Template.findById(toObjectId(templateId)).lean()
    if (!template) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Template not found.',
      })
    }

    // Ensure all required fields are present in draft and published
    const newTemplate = new Template({
      userId,
      draft: {
        name: template.name,
        mode: template.mode,
        colors: {
          light: template.colors.light,
          dark: template.colors.dark,
        },
        fonts: template.fonts,
      },
      published: {
        name: template.name,
        mode: template.mode,
        colors: {
          light: template.colors.light,
          dark: template.colors.dark,
        },
        fonts: {
          header: template.fonts.header,
          body: template.fonts.body,
        },
      },
    })

    const savedTemplate = await newTemplate.save()

    const user = await User.findById(userId)
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'User not found.',
      })
    }
    user.isTemplateSelected = true
    user.template = savedTemplate._id
    await user.save()

    res.status(StatusCodes.OK).json({
      data: null,
      message: 'Template updated successfully.',
    })
  }),

  getPredefined: asyncMiddleware(async (req, res) => {
    // const { _id: userId } = req.decoded
    // const { templateId } = req.params

    const templates = await Template.find({ predefined: true })

    if (!templates) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Templates not found.',
      })
    }

    res.status(StatusCodes.OK).json({
      data: templates,
      message: 'Template fetched successfully.',
    })
  }),
  getUsernameTemplate: asyncMiddleware(async (req, res) => {
    // const { _id: userId } = req.decoded
    const { userName } = req.body

    const data = await User.find({ userName })
      .populate('template')
      .populate('profile')
      .populate('about')
      .populate('shop')

    if (!data) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Data not found.',
      })
    }
    res.status(StatusCodes.OK).json({
      data: data,
      message: 'Data fetched successfully.',
    })
  }),
}
