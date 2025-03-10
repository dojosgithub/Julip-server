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
import { Product, Shop, User } from '../models'

// * Middlewares
import { asyncMiddleware } from '../middlewares'
import { Sample } from '../models/Sample'

const { ObjectId } = mongoose.Types

// const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
// const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
// const REDIRECT_URI = 'http://localhost:3000/api/user/auth/google/callback'

export const CONTROLLER_SAMPLE = {
  createSampleCategory: asyncMiddleware(async (req, res) => {
    const { name, visibility, categoryList } = req.body

    if (!name) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Name is required.',
      })
    }

    const sample = new Sample({ name, visibility, categoryList })
    await sample.save()

    res.status(StatusCodes.CREATED).json({
      data: sample,
      message: 'Sample created successfully.',
    })
  }),

  addSampleItem: asyncMiddleware(async (req, res) => {
    const { id } = req.query
    const { categoryName, url, tile, buttonTitle, visibility } = req.body

    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Sample ID is required.',
      })
    }

    if (!categoryName) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Category name is required.',
      })
    }
    const sample = await Sample.findById(id)
    if (!sample) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Sample not found.',
      })
    }

    // Find the category by name
    const category = sample.categoryList.find((cat) => cat.name === categoryName)

    if (!category) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Category not found in the sample.',
      })
    }

    // Add the new item to the sampleList
    category.sampleList.push({ url, tile, buttonTitle, visibility })

    // Save the updated sample
    await sample.save()

    res.status(StatusCodes.OK).json({
      data: sample,
      message: 'Item added to sampleList successfully.',
    })
  }),

  getSampleById: asyncMiddleware(async (req, res) => {
    const { id } = req.params

    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Sample ID is required.',
      })
    }

    const sample = await Sample.findById(id)

    if (!sample) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Sample not found.',
      })
    }

    res.status(StatusCodes.OK).json({
      data: sample,
      message: 'Sample retrieved successfully.',
    })
  }),

  getSampleCategory: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded
    const user = await User.findById(userId).populate({
      path: 'portfolio',
      populate: {
        path: 'sample',
        model: 'Sample',
      },
    })
    res.status(StatusCodes.OK).json({
      data: user,
      message: 'Sample retrieved successfully.',
    })
  }),

  updateSampleCategory: asyncMiddleware(async (req, res) => {
    const { id } = req.params
    const { name, visibility, categoryList } = req.body

    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Sample ID is required.',
      })
    }

    const updatedSample = await Sample.findByIdAndUpdate(id, { name, visibility, categoryList }, { new: true })

    if (!updatedSample) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Sample not found.',
      })
    }

    res.status(StatusCodes.OK).json({
      data: updatedSample,
      message: 'Sample updated successfully.',
    })
  }),

  deleteSample: asyncMiddleware(async (req, res) => {
    const { id } = req.params

    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Sample ID is required.',
      })
    }

    const deletedSample = await Sample.findByIdAndDelete(id)

    if (!deletedSample) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Sample not found.',
      })
    }

    res.status(StatusCodes.OK).json({
      message: 'Sample deleted successfully.',
    })
  }),
}
