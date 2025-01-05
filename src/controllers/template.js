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
    const { mode, colors, fonts } = req.body

    // Validate required fields
    if (!mode || !colors || !fonts) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Mode, colors, and fonts are required.',
      })
    }

    // Create a new template
    const template = new Template({
      mode,
      colors,
      fonts,
    })

    await template.save()

    res.status(StatusCodes.CREATED).json({
      data: template,
      message: 'Template created successfully.',
    })
  }),

  updateTemplate: asyncMiddleware(async (req, res) => {
    const { id } = req.query
    const { mode, colors, fonts } = req.body

    // Validate ID
    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Template ID is required.',
      })
    }

    // Validate fields to update
    if (!mode && !colors && !fonts) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'At least one field is required to update.',
      })
    }

    // Update the template
    const updatedTemplate = await Template.findByIdAndUpdate(id, { mode, colors, fonts }, { new: true })

    if (!updatedTemplate) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Template not found.',
      })
    }

    res.status(StatusCodes.OK).json({
      data: updatedTemplate,
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
    const { id } = req.params

    // Validate ID
    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Template ID is required.',
      })
    }

    // fetched the template
    const template = await Template.findById(id)

    if (!template) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Template not found.',
      })
    }

    res.status(StatusCodes.OK).json({
      data: template,
      message: 'Template fetched successfully.',
    })
  }),
}
