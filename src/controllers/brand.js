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
import { Brand } from '../models/Brand'

const { ObjectId } = mongoose.Types

// const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
// const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
// const REDIRECT_URI = 'http://localhost:3000/api/user/auth/google/callback'

export const CONTROLLER_BRAND = {
  // Create a brand
  createBrandCollection: asyncMiddleware(async (req, res) => {
    const parsedBody = JSON.parse(req.body.body)
    let image
    const { name, visibility, oneLiner, brandList } = parsedBody

    if (!name) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Name is required.',
      })
    }

    // Add uploaded image if provided
    if (req.file) {
      image = req.file.path
    }

    const brand = new Brand({ name, visibility, oneLiner, brandList, image })
    await brand.save()

    res.status(StatusCodes.CREATED).json({
      data: brand,
      message: 'Brand Collection created successfully.',
    })
  }),
  createBrand: asyncMiddleware(async (req, res) => {
    const parsedBody = JSON.parse(req.body.body)
    let image
    const { name, url } = parsedBody

    if (!name) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Name is required.',
      })
    }

    // Add uploaded image if provided
    if (req.file) {
      image = req.file.path
    }

    const brand = new Brand({ name, url, image })
    await brand.save()

    res.status(StatusCodes.CREATED).json({
      data: brand,
      message: 'Brand created successfully.',
    })
  }),

  getBrandCollection: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded
    const user = await User.findById(userId).populate({
      path: 'portfolio',
      populate: {
        path: 'brand',
        model: 'Brand',
      },
    })
    res.status(StatusCodes.OK).json({
      data: user,
      message: 'Audiences retrieved successfully.',
    })
  }),

  // Get a brand by ID
  getBrandById: asyncMiddleware(async (req, res) => {
    const { id } = req.params

    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Brand ID is required.',
      })
    }

    const brand = await Brand.findById(id)

    if (!brand) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Brand not found.',
      })
    }

    res.status(StatusCodes.OK).json({
      data: brand,
      message: 'Brand retrieved successfully.',
    })
  }),

  // Update a brand
  updateBrandCollection: asyncMiddleware(async (req, res) => {
    const { id } = req.params
    const parsedBody = JSON.parse(req.body.body)
    let image
    const { name, visibility, oneLiner, brandList } = parsedBody

    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Brand ID is required.',
      })
    }

    // Add uploaded image if provided
    if (req.file) {
      image = req.file.path
    }

    const updatedBrand = await Brand.findByIdAndUpdate(
      id,
      { name, visibility, oneLiner, brandList, image },
      { new: true }
    )

    if (!updatedBrand) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Brand not found.',
      })
    }

    res.status(StatusCodes.OK).json({
      data: updatedBrand,
      message: 'Brand updated successfully.',
    })
  }),

  updateBrand: asyncMiddleware(async (req, res) => {
    const { id } = req.params
    const parsedBody = JSON.parse(req.body.body)
    let image
    const { name, url } = parsedBody

    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Brand ID is required.',
      })
    }

    // Add uploaded image if provided
    if (req.file) {
      image = req.file.path
    }

    const updatedBrand = await Brand.findByIdAndUpdate(id, { name, url, image }, { new: true })

    if (!updatedBrand) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Brand not found.',
      })
    }

    res.status(StatusCodes.OK).json({
      data: updatedBrand,
      message: 'Brand updated successfully.',
    })
  }),

  // Delete a brand
  deleteBrand: asyncMiddleware(async (req, res) => {
    const { id } = req.params

    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Brand ID is required.',
      })
    }

    const deletedBrand = await Brand.findByIdAndDelete(id)

    if (!deletedBrand) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Brand not found.',
      })
    }

    res.status(StatusCodes.OK).json({
      message: 'Brand deleted successfully.',
    })
  }),
}
