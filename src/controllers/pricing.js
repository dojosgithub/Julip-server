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

export const CONTROLLER_PRICING = {
  selectPricing: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded
    const { pricing } = req.body

    if (!pricing) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Pricing Plan is required.',
      })
    }
    // const template = await Template.findById(toObjectId(templateId))

    // if (!template) {
    //   return res.status(StatusCodes.NOT_FOUND).json({
    //     message: 'Template not found.',
    //   })
    // }
    const user = await User.findById(userId)
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'User not found.',
      })
    }
    user.isPricingSelected = true
    user.userTypes = pricing
    await user.save()

    res.status(StatusCodes.OK).json({
      data: null,
      message: 'Pricing Plan updated successfully.',
    })
  }),
}
