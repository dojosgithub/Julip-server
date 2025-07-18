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
    const { version = 'draft' } = req.query // Default to "draft" version

    if (!userId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'User ID is required.',
      })
    }

    // Find the portfolio for the user and populate the audienceList
    const portfolio = await Portfolio.findOne({ userId }).populate({
      path: `${version}.audience.audienceList`,
      model: 'Audience',
    })

    // Log the portfolio for debugging purposes (remove in production)
    console.log('Portfolio:', portfolio)

    // Check if the portfolio exists and has an audience in the specified version
    if (!portfolio || !portfolio[version]?.audience?.audienceList?.length) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Audience not found.',
      })
    }

    // Extract the audience data
    const { audience } = portfolio[version]
    const { name, visibility, audienceList } = audience

    // Return the audience data
    res.status(StatusCodes.OK).json({
      data: {
        name,
        visibility,
        audienceList,
      },
      message: 'Audiences retrieved successfully.',
    })
  }),
  createAndUpdateAudience: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded
    const { version = 'draft' } = req.query // Default to "draft" version
    const newPlatform = req.body

    if (!userId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'User ID is required.',
      })
    }

    // Find the user by ID and populate the portfolio
    const user = await User.findById(userId).populate({
      path: 'portfolio',
      populate: {
        path: `${version}.audience.audienceList`,
        model: 'Audience',
      },
    })
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'User not found.',
      })
    }

    // Check if the user has a portfolio
    if (!user.portfolio) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Portfolio not found for this user.',
      })
    }

    // Extract the audience data for the specified version
    let audience = user.portfolio[version]?.audience

    if (!audience || !audience.audienceList?.length) {
      // Create a new audience if it doesn't exist
      const newAudience = new Audience(newPlatform)

      // Save the new audience document
      await newAudience.save()
      // Initialize the audience object if it doesn't exist
      if (!audience) {
        audience = {
          name: 'Audience', // Set a default name
          visibility: true, // Set default visibility
          audienceList: [newAudience._id], // Initialize the audienceList array
        }
        user.portfolio[version].audience = audience
      } else {
        user.portfolio[version].audience.visibility = true
        user.portfolio[version].audience.audienceList = [newAudience._id]
      }

      // Save the updated portfolio
      await user.portfolio.save()
    } else {
      const newAudience = new Audience(newPlatform)
      await newAudience.save()

      user.portfolio[version].audience.visibility = true
      user.portfolio[version].audience.audienceList.push(newAudience._id)

      await user.portfolio.save()
    }
    await user.portfolio.save()
    // Get the updated portfolio with populated audience data
    const updatedUser = await User.findById(userId).populate({
      path: 'portfolio',
      populate: {
        path: `${version}.audience.audienceList`,
        model: 'Audience',
      },
    })
    res.status(StatusCodes.OK).json({
      data: updatedUser.portfolio[version]?.audience,
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
