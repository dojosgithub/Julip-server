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
import { Audience, Contact, Product, Shop, User } from '../models'

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

  updateAudience: asyncMiddleware(async (req, res) => {
    const { id } = req.query
    const { name, visibility, instagram, tiktok, youtube, linkedin } = req.body

    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Audience ID is required.',
      })
    }

    const updatedAudience = await Audience.findByIdAndUpdate(
      id,
      { name, visibility, instagram, tiktok, youtube, linkedin },
      { new: true }
    )

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
