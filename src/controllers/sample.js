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
import { Portfolio, Product, Shop, User } from '../models'

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

  // Create and update a sample item by category name and item name
  createAndUpdateSampleItemByName: asyncMiddleware(async (req, res) => {
    const { id } = req.query
    const { categoryName, itemName, url, tile, visibility } = req.body

    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Sample ID is required.',
      })
    }

    if (!categoryName || !itemName) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Category name and item name are required.',
      })
    }

    const sample = await Sample.findById(id)

    if (!sample) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Sample not found.',
      })
    }

    // Find the category by name
    let category = sample.categoryList.find((cat) => cat.name === categoryName)

    // If the category does not exist, create a new one
    if (!category) {
      category = {
        name: categoryName,
        sampleList: [],
      }
      sample.categoryList.push(category)
    }

    // Find the item by name
    let item = category.sampleList.find((item) => item.tile === itemName)

    // If the item does not exist, create a new one
    if (!item) {
      item = {
        url: url || '',
        tile: tile || '',
        visibility: visibility || '',
      }
      category.sampleList.push(item)
    } else {
      // Update the existing item
      if (url) item.url = url
      if (tile) item.tile = tile
      if (visibility) item.visibility = visibility
    }

    // Save the updated sample
    await sample.save()

    res.status(StatusCodes.OK).json({
      data: sample,
      message: 'Sample item created/updated successfully.',
    })
  }),

  // Delete a sample item by category name and item name
  deleteSampleItemByName: asyncMiddleware(async (req, res) => {
    const { id } = req.query
    const { categoryName, itemName } = req.body

    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Sample ID is required.',
      })
    }

    if (!categoryName || !itemName) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Category name and item name are required.',
      })
    }

    const sample = await Sample.findById(id)

    if (!sample) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Sample not found.',
      })
    }

    const category = sample.categoryList.find((cat) => cat.name === categoryName)

    if (!category) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Category not found in the sample.',
      })
    }

    const itemIndex = category.sampleList.findIndex((item) => item.tile === itemName)

    if (itemIndex === -1) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Item not found in the category.',
      })
    }

    category.sampleList.splice(itemIndex, 1)

    await sample.save()

    res.status(StatusCodes.OK).json({
      message: 'Sample item deleted successfully.',
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

  updateSampleCategory: asyncMiddleware(async (req, res) => {
    const { id } = req.params
    const { name, visibility, categoryList } = req.body

    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'User ID is required.',
      })
    }

    // Find the user by ID and populate the portfolio and sample
    const user = await User.findById(id).populate({
      path: 'portfolio',
      populate: {
        path: 'sample',
        model: 'Sample',
      },
    })

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'User not found.',
      })
    }

    let updatedSample

    // Check if the user has a portfolio
    if (!user.portfolio) {
      // Create a new portfolio for the user
      const newPortfolio = new Portfolio({ user: user._id })
      user.portfolio = newPortfolio
      await user.save()
      await newPortfolio.save()
    }

    // Check if the portfolio has a sample
    if (!user.portfolio.sample) {
      // Create a new sample for the portfolio
      const newSample = new Sample({
        name,
        visibility,
        categoryList,
      })
      user.portfolio.sample = newSample
      await user.portfolio.save()
      await newSample.save()
      updatedSample = newSample
    } else {
      // Update the existing sample
      updatedSample = await Sample.findByIdAndUpdate(
        user.portfolio.sample._id,
        { name, visibility, categoryList },
        { new: true }
      )
    }

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
  createSampleItem: asyncMiddleware(async (req, res) => {
    try {
      const { name, sampleList } = req.body

      // Create the sample
      const newSample = new Sample({
        name,
        sampleList,
      })

      await newSample.save()

      res.status(StatusCodes.CREATED).json({
        data: newSample,
        message: 'Sample created successfully.',
      })
    } catch (error) {
      console.error('Error creating sample:', error)
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: 'An error occurred while creating the sample.',
      })
    }
  }),
  updateSampleItem: async (req, res) => {
    try {
      const { id } = req.params
      const { name, sampleList } = req.body

      // Find the sample by ID
      const sample = await Sample.findById(id)
      if (!sample) {
        return res.status(StatusCodes.NOT_FOUND).json({
          message: 'Sample not found.',
        })
      }

      // Update the sample fields
      sample.name = name || sample.name
      sample.sampleList = sampleList || sample.sampleList

      // Save the updated sample
      await sample.save()

      res.status(StatusCodes.OK).json({
        data: sample,
        message: 'Sample updated successfully.',
      })
    } catch (error) {
      console.error('Error updating sample:', error)
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: 'An error occurred while updating the sample.',
      })
    }
  },
  deleteSampleListItem: asyncMiddleware(async (req, res) => {
    try {
      const { id } = req.params // Sample document ID
      const { tile } = req.body // Title of the object to delete

      // Validate input
      if (!id || !tile) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: 'Both sample ID and tile are required.',
        })
      }

      // Find the sample by ID
      const sample = await Sample.findById(id)
      if (!sample) {
        return res.status(StatusCodes.NOT_FOUND).json({
          message: 'Sample not found.',
        })
      }

      // Find the index of the object in sampleList with the matching tile
      const itemIndex = sample.sampleList.findIndex((item) => item.tile === tile)

      // If no matching item is found, return an error
      if (itemIndex === -1) {
        return res.status(StatusCodes.NOT_FOUND).json({
          message: 'No item found with the specified title.',
        })
      }

      // Remove the item from the sampleList array
      sample.sampleList.splice(itemIndex, 1)

      // Save the updated sample document
      await sample.save()

      // Respond with success message and updated sample
      res.status(StatusCodes.OK).json({
        data: sample,
        message: 'Item deleted successfully from sampleList.',
      })
    } catch (error) {
      console.error('Error deleting item from sampleList:', error)
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: 'An error occurred while deleting the item.',
      })
    }
  }),
  updatePortfolioSample: asyncMiddleware(async (req, res) => {
    try {
      const { _id: userId } = req.decoded
      const { version = 'draft' } = req.query
      const { name, visibility, categoryList } = req.body

      // Find the portfolio by ID
      const portfolio = await Portfolio.findOne({ userId })
      if (!portfolio) {
        return res.status(StatusCodes.NOT_FOUND).json({
          message: 'Portfolio not found.',
        })
      }

      // Validate categoryList references
      if (categoryList) {
        const validSamples = await Sample.find({ _id: { $in: categoryList } })
        if (validSamples.length !== categoryList.length) {
          return res.status(StatusCodes.BAD_REQUEST).json({
            message: 'One or more categoryList IDs are invalid.',
          })
        }
      }

      // Update the sample field in the specified version
      portfolio[version].sample.name = name || portfolio[version].sample.name
      portfolio[version].sample.visibility =
        visibility !== undefined ? visibility : portfolio[version].sample.visibility
      portfolio[version].sample.categoryList = categoryList || portfolio[version].sample.categoryList

      // Save the updated portfolio
      await portfolio.save()

      res.status(StatusCodes.OK).json({
        data: portfolio,
        message: 'Portfolio sample updated successfully.',
      })
    } catch (error) {
      console.error('Error updating portfolio sample:', error)
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: 'An error occurred while updating the portfolio sample.',
      })
    }
  }),
  getPortfolioSample: asyncMiddleware(async (req, res) => {
    try {
      const { _id: userId } = req.decoded
      const { version = 'draft' } = req.query // Default to "draft" version

      // Find the portfolio by userId and populate the categoryList in the specified version
      const portfolio = await Portfolio.findOne({ userId }).populate({
        path: `${version}.sample.categoryList`,
        model: 'Sample',
      })

      // Check if the portfolio exists
      if (!portfolio) {
        return res.status(StatusCodes.NOT_FOUND).json({
          message: 'Portfolio not found.',
        })
      }

      // Extract the sample data for the specified version
      const sampleData = portfolio[version]?.sample

      // Check if the sample data exists
      if (!sampleData) {
        return res.status(StatusCodes.NOT_FOUND).json({
          message: 'Sample data not found in the specified version.',
        })
      }

      // Return the sample data
      res.status(StatusCodes.OK).json({
        data: sampleData,
        message: 'Portfolio sample retrieved successfully.',
      })
    } catch (error) {
      console.error('Error retrieving portfolio sample:', error)
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: 'An error occurred while retrieving the portfolio sample.',
      })
    }
  }),
}
