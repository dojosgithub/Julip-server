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
    const { _id: userId } = req.decoded
    const pages = await Pages.findOne({ user: userId }).lean()
    res.status(StatusCodes.CREATED).json({
      data: pages,
      message: 'Pages list successfully fetched.',
    })
  }),

  // Update a PAGES
  updatePages: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded
    const { pagesList, visibility } = req.body
    const pages = await Pages.findOneAndUpdate(
      { user: userId },
      { pagesList, visibility }, // Simply update the array
      { new: true }
    )
    return res.status(StatusCodes.OK).json({
      message: 'Pages sequence has been updated.',
    })
  }),

  // GET /api/pages/:id - Fetch a specific page by ID
  // getPagesList: asyncMiddleware(async (req, res) => {
  //   try {
  //     const { id } = req.params

  //     // Find the page by ID
  //     const page = await Pages.findById(id)

  //     if (!page) {
  //       return res.status(StatusCodes.NOT_FOUND).json({
  //         message: 'Page not found.',
  //       })
  //     }

  //     // Return the page data
  //     res.status(StatusCodes.OK).json({
  //       data: page,
  //       message: 'Page fetched successfully.',
  //     })
  //   } catch (error) {
  //     console.error('Error fetching page:', error)
  //     res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
  //       message: 'An error occurred while fetching the page.',
  //     })
  //   }
  // }),

  // PUT /api/pages/:id - Update a specific page by ID
  // updatePages: asyncMiddleware(async (req, res) => {
  //   try {
  //     const { id } = req.params
  //     const { title, content, status } = req.body

  //     // Find the page by ID
  //     const page = await Pages.findById(id)

  //     if (!page) {
  //       return res.status(StatusCodes.NOT_FOUND).json({
  //         message: 'Page not found.',
  //       })
  //     }

  //     // Update the page fields
  //     page.title = title || page.title
  //     page.content = content || page.content
  //     page.status = status || page.status

  //     // Save the updated page
  //     await page.save()

  //     // Return the updated page data
  //     res.status(StatusCodes.OK).json({
  //       data: page,
  //       message: 'Page updated successfully.',
  //     })
  //   } catch (error) {
  //     console.error('Error updating page:', error)
  //     res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
  //       message: 'An error occurred while updating the page.',
  //     })
  //   }
  // }),
}
