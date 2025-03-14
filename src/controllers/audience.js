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
    const { instagram, tiktok, youtube, linkedin } = req.body

    if (!userId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'User ID is required.',
      })
    }

    // Find the user by ID and populate the portfolio
    const user = await User.findById(userId).populate('portfolio')

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
    let updatedAudience

    if (!audience || !audience.audienceList?.length) {
      // Create a new audience if it doesn't exist
      const newAudience = new Audience({
        instagram,
        tiktok,
        youtube,
        linkedin,
      })

      // Save the new audience document
      await newAudience.save()

      // Initialize the audience object if it doesn't exist
      if (!audience) {
        audience = {
          name: 'Default Audience Name', // Set a default name
          visibility: true, // Set default visibility
          audienceList: [], // Initialize the audienceList array
        }
        user.portfolio[version].audience = audience
      }

      // Append the new audience's _id to the audienceList array
      audience.audienceList.push(newAudience._id)

      // Save the updated portfolio
      await user.portfolio.save()

      updatedAudience = newAudience
    } else {
      // Update the existing audience
      const audienceId = audience.audienceList[0] // Assuming only one audience exists in the list
      updatedAudience = await Audience.findByIdAndUpdate(
        audienceId,
        { instagram, tiktok, youtube, linkedin },
        { new: true }
      )

      if (!updatedAudience) {
        return res.status(StatusCodes.NOT_FOUND).json({
          message: 'Failed to update audience.',
        })
      }
    }

    res.status(StatusCodes.OK).json({
      data: updatedAudience,
      message: audience?.audienceList?.length ? 'Audience updated successfully.' : 'Audience created successfully.',
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
