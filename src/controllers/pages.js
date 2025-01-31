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
import { Pages, Product, Shop, User } from '../models'

// * Middlewares
import { asyncMiddleware } from '../middlewares'

const { ObjectId } = mongoose.Types

// const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
// const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
// const REDIRECT_URI = 'http://localhost:3000/api/user/auth/google/callback'

export const CONTROLLER_PAGES = {
  // Create a PAGES
  getPagesList: asyncMiddleware(async (req, res) => {
    const { userId } = req.decoded
    const pages = Pages.findOne({ user: userId })
    res.status(StatusCodes.CREATED).json({
      data: pages,
      message: 'Pages list successfully fetched.',
    })
  }),

  // Update a PAGES
  updatePages: asyncMiddleware(async (req, res) => {
    const { userId } = req.decoded
    const pages = await Pages.findOneAndUpdate(
      { user: userId },
      { pagesList: updatedPagesList }, // Simply update the array
      { new: true }
    )
    return res.status(StatusCodes.OK).json({
      message: 'Pages sequence has been updated.',
    })
  }),
}
