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
import { Audience, Contact, Portfolio, Product, Shop, User } from '../models'

// * Middlewares
import { asyncMiddleware } from '../middlewares'

const { ObjectId } = mongoose.Types

export const CONTROLLER_AUDIENCE = {
  createAudience: asyncMiddleware(async (req, res) => {
    const { name, visibility, instagram, tiktok, youtube, linkedin } = req.body

    if (!name) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Name is required.',
      })
    }

    const audience = new Audience({ name, visibility, instagram, tiktok, youtube, linkedin })
    await audience.save()

    res.status(StatusCodes.CREATED).json({
      data: audience,
      message: 'Audience created successfully.',
    })
  }),

  getAudiences: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded
    const user = await User.find().populate({
      path: 'portfolio',
      populate: {
        path: 'audience',
        model: 'Audience',
      },
    })
    res.status(StatusCodes.OK).json({
      data: user,
      message: 'Audiences retrieved successfully.',
    })
  }),

  createAndupdateAudience: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded
    const { name, visibility, instagram, tiktok, youtube, linkedin } = req.body

    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'User ID is required.',
      })
    }

    // Find the user by ID and populate the portfolio and audience
    const user = await User.findById(userId).populate({
      path: 'portfolio',
      populate: {
        path: 'audience',
        model: 'Audience',
      },
    })

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'User not found.',
      })
    }

    let updatedAudience

    // Check if the user has a portfolio
    if (!user.portfolio) {
      // Create a new portfolio for the user
      const newPortfolio = new Portfolio({ user: user._id })
      user.portfolio = newPortfolio
      await user.save()
      await newPortfolio.save()
    }

    // Check if the portfolio has an audience
    if (!user.portfolio.audience) {
      // Create a new audience for the portfolio
      const newAudience = new Audience({
        name,
        visibility,
        instagram,
        tiktok,
        youtube,
        linkedin,
      })
      user.portfolio.audience = newAudience
      await user.portfolio.save()
      await newAudience.save()
      updatedAudience = newAudience
    } else {
      // Update the existing audience
      updatedAudience = await Audience.findByIdAndUpdate(
        user.portfolio.audience._id,
        { name, visibility, instagram, tiktok, youtube, linkedin },
        { new: true }
      )
    }

    if (!updatedAudience) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Audience not found.',
      })
    }

    res.status(StatusCodes.OK).json({
      data: updatedAudience,
      message: 'Audience updated successfully.',
    })
  }),

  deleteAudience: asyncMiddleware(async (req, res) => {
    const { id } = req.query

    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Audience ID is required.',
      })
    }

    const deletedAudience = await Audience.findByIdAndDelete(id)

    if (!deletedAudience) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Audience not found.',
      })
    }

    res.status(StatusCodes.OK).json({
      message: 'Audience deleted successfully.',
    })
  }),
}
