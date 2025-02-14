// * Libraries
import { StatusCodes } from 'http-status-codes'
import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

// * Middlewares
import { asyncMiddleware } from '../middlewares'

import { About } from '../models/About'

const { ObjectId } = mongoose.Types

// const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
// const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
// const REDIRECT_URI = 'http://localhost:3000/api/user/auth/google/callback'

export const CONTROLLER_ABOUT = {
  addAboutItems: asyncMiddleware(async (req, res) => {
    const body = JSON.parse(req.body.body)
    const { userId, items = [] } = body

    // Validate required fields
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required.' })
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items array is required and must not be empty.' })
    }

    const validTypes = ['heading', 'description', 'image']
    let imageFileIndex = 0

    // Process and validate items
    const processedItems = items.map((item, index) => {
      if (!item.type || !validTypes.includes(item.type)) {
        return res.status(400).json({ message: `Invalid item type: ${item.type}` })
      }

      // Validate common fields
      if (typeof item.visibility !== 'boolean') {
        return res.status(400).json({ message: 'Each item must have a visibility property of true or false.' })
      }

      if (item.type === 'image') {
        if (!req.files || !req.files[imageFileIndex]) {
          return res.status(400).json({ message: 'Image file is missing for an image item.' })
        }

        const file = req.files[imageFileIndex]
        imageFileIndex++

        return {
          type: 'image',
          value: { url: file.path }, // Store image metadata as an object
          description: item.description || '', // Optional description
          imageStyle: item.imageStyle || 'horizontal', // Default style
          visibility: item.visibility ?? true,
          descriptionVisibility: item.descriptionVisibility ?? true,
          sequence: item.sequence ?? index,
        }
      }

      // Validate other types
      if (!item.value && item.type !== 'image') {
        throw new Error('Each item must have a value.')
      }

      return {
        type: item.type,
        value: item.value,
        description: item.description || '', // Optional description
        visibility: item.visibility ?? true,
        descriptionVisibility: item.descriptionVisibility ?? true,
        sequence: item.sequence ?? index,
      }
    })

    // Find or create the About document
    const about = await About.findOne({ userId })
    if (!about) {
      const newAbout = new About({
        userId,
        draft: { items: processedItems },
        published: { items: processedItems },
      })
      await newAbout.save()
      return res.status(201).json({ data: newAbout, message: 'About section created successfully.' })
    }

    // Merge new items with existing ones
    about.items.push(...processedItems)

    // Sort items by sequence to maintain the desired order
    about.items.sort((a, b) => a.sequence - b.sequence)

    await about.save()

    // Return the updated About document
    const { draft, published, ...restAbout } = about.toObject()
    const modifiedAbout = {
      ...restAbout,
      ...draft,
    }

    res.status(200).json({ data: modifiedAbout, message: 'About section updated successfully.' })
  }),

  updateAboutItems: asyncMiddleware(async (req, res) => {
    const body = JSON.parse(req.body.body)
    const { version = 'draft' } = req.query
    const { userId, items = [] } = body

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required.' })
    }
    if (!Array.isArray(items)) {
      return res.status(400).json({ message: 'Items must be an array.' })
    }

    const validTypes = ['heading', 'description', 'image']
    let imageFileIndex = 0

    // Process and validate items
    const processedItems = items.map((item, index) => {
      if (!item.type || !validTypes.includes(item.type)) {
        throw new Error(`Invalid item type: ${item.type}`)
      }

      if (item.type === 'image') {
        if (item.value && typeof item.value === 'object' && item.value.url) {
          // Retain existing image URL if provided
          return {
            ...item,
            sequence: item.sequence ?? index,
          }
        }

        // Use the uploaded image for the item
        const file = req.files[imageFileIndex]
        imageFileIndex++

        return {
          type: 'image',
          value: file.path, // Store image metadata as an object
          description: item.description || '',
          imageStyle: item.imageStyle || 'horizontal',
          visibility: item.visibility ?? true,
          descriptionVisibility: item.descriptionVisibility ?? true,
          sequence: item.sequence ?? index,
        }
      }

      // Validate other types
      if (!item.value && item.type !== 'image') {
        return res.status(400).json({ message: 'Each item must have a value.' })
      }

      if (typeof item.visibility !== 'boolean') {
        return res.status(400).json({ message: 'Each item must have a visibility property of true or false.' })
      }

      return {
        ...item,
        sequence: item.sequence ?? index,
      }
    })

    const about = await About.findOne({ userId })
    if (!about) {
      return res.status(404).json({ message: 'About section not found for this user.' })
    }

    if (version === 'draft') {
      about.draft.items = processedItems.sort((a, b) => a.sequence - b.sequence)
    } else if (version === 'published') {
      about.published.items = processedItems.sort((a, b) => a.sequence - b.sequence)
    }

    await about.save()

    const { draft, published, ...restAbout } = about.toObject()
    let modifiedAbout
    if (version === 'draft') {
      modifiedAbout = {
        ...restAbout,
        ...draft,
      }
    } else if (version === 'published') {
      modifiedAbout = {
        ...restAbout,
        ...published,
      }
    }

    res.status(200).json({
      data: modifiedAbout,
      message: 'About section updated successfully.',
    })
  }),
  createAndUpdateAbout: asyncMiddleware(async (req, res) => {
    const body = JSON.parse(req.body.body)
    const { userId, items = [], version = 'draft' } = body

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required.' })
    }

    if (!Array.isArray(items)) {
      return res.status(400).json({ message: 'Items must be an array.' })
    }

    const validTypes = ['heading', 'description', 'image']

    // Index to track image files in req.files
    let imageFileIndex = 0

    // Process and validate items
    const processedItems = items.map((item, index) => {
      if (!item.type || !validTypes.includes(item.type)) {
        throw new Error(`Invalid item type: ${item.type}`)
      }

      if (item.type === 'image') {
        if (item.value && item.value.startsWith('http')) {
          // Retain existing image URL if provided
          return {
            ...item,
            sequence: item.sequence ?? index,
          }
        }

        if (!req.files || !req.files[imageFileIndex]) {
          throw new Error('Image file is missing for an image item.')
        }

        // Use the uploaded image for the item
        const file = req.files[imageFileIndex]
        imageFileIndex++

        return {
          type: 'image',
          value: file.path,
          visibility: item.visibility ?? true,
          sequence: item.sequence ?? index,
        }
      }

      if (!item.value) {
        throw new Error('Each item must have a value.')
      }

      if (typeof item.visibility !== 'boolean') {
        throw new Error('Each item must have a visibility property of true or false.')
      }

      return {
        ...item,
        sequence: item.sequence ?? index,
      }
    })

    let about = await About.findOne({ userId })

    if (!about) {
      // Create a new About section if it doesn't exist
      about = new About({
        userId,
        draft: { items: processedItems },
        published: { items: processedItems },
      })
      await about.save()
      return res.status(201).json({ data: about, message: 'About section created successfully.' })
    }

    // Update the existing About section
    if (version === 'draft') {
      about.draft.items = processedItems.sort((a, b) => a.sequence - b.sequence)
    } else if (version === 'published') {
      about.published.items = processedItems.sort((a, b) => a.sequence - b.sequence)
    }

    await about.save()

    const { draft, published, ...restAbout } = about.toObject()
    let modifiedAbout

    if (version === 'draft') {
      modifiedAbout = {
        ...restAbout,
        ...draft,
      }
    } else if (version === 'published') {
      modifiedAbout = {
        ...restAbout,
        ...published,
      }
    }

    res.status(200).json({
      data: modifiedAbout,
      message: 'About section updated successfully.',
    })
  }),
  deleteAboutItems: asyncMiddleware(async (req, res) => {
    const { userId, itemIds = [] } = req.body

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required.' })
    }

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ message: 'Item IDs array is required and must not be empty.' })
    }

    const about = await About.findOne({ userId })

    if (!about) {
      return res.status(404).json({ message: 'About section not found.' })
    }

    // Remove items with matching IDs
    about.items = about.items.filter((item) => !itemIds.includes(item._id.toString()))

    await about.save()

    res.status(200).json({ data: about, message: 'About items deleted successfully.' })
  }),

  getAbout: asyncMiddleware(async (req, res) => {
    const { id, version = 'draft' } = req.query
    const { _id: userId } = req.decoded
    const about = await About.findOne({ userId })
    if (!about) {
      return res.status(404).json({ message: 'About section not found.' })
    }
    if (version === 'draft') {
      return res.status(200).json({ data: about.draft.items })
    } else if (version === 'published') {
      return res.status(200).json({ data: about.published.items })
    }
  }),
}
