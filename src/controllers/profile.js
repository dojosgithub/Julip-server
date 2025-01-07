// * Libraries
import { StatusCodes } from 'http-status-codes'
import { isEmpty, isUndefined, concat, cloneDeep } from 'lodash'
const axios = require('axios')
import dotenv from 'dotenv'

dotenv.config()

// * Models
import { User, Profile } from '../models'

// * Middlewares
import { asyncMiddleware } from '../middlewares'

// * Utilities

export const CONTROLLER_PROFILE = {
  createProfile: asyncMiddleware(async (req, res) => {
    const body = await JSON.parse(req.body.body)
    const userId = body.userId

    if (!userId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'User ID is required.',
      })
    }

    // Mapping of platforms to their base URLs
    const platformBaseUrls = {
      Instagram: 'https://instagram.com/',
      TikTok: 'https://www.tiktok.com/@',
      YouTube: 'https://www.youtube.com/c/',
      Facebook: 'https://facebook.com/',
      Discord: 'https://discord.gg/',
      Threads: 'https://threads.net/',
      LinkedIn: 'https://linkedin.com/in/',
      Pinterest: 'https://pinterest.com/',
      Spotify: 'https://open.spotify.com/user/',
      Snapchat: 'https://www.snapchat.com/add/',
    }

    // Validate socialLinks
    if (body.socialLinks && Array.isArray(body.socialLinks)) {
      const invalidPlatform = body.socialLinks.find((link) => !platformBaseUrls[link.platform])

      if (invalidPlatform) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: `Invalid platform: ${invalidPlatform.platform}.`,
        })
      }

      body.socialLinks = body.socialLinks.map((link) => {
        const { platform, url } = link
        const baseUrl = platformBaseUrls[platform]
        return {
          platform,
          url: url.startsWith('http') ? url : `${baseUrl}${url}`,
        }
      })
    }

    // Validate webLinks
    if (body.webLinks && Array.isArray(body.webLinks)) {
      const invalidWebLink = body.webLinks.find((webLink) => !webLink.title || !webLink.link)

      if (invalidWebLink) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: 'Both title and link are required for all webLinks.',
        })
      }

      body.webLinks = body.webLinks.map((webLink) => {
        const { title, link } = webLink
        return {
          title,
          link: link.startsWith('http') ? link : `https://${link}`,
        }
      })
    }

    // Add uploaded image if provided
    if (req.file) {
      body.image = req.file.path
    }

    // Check if user exists
    const user = await User.findById(userId).exec()
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'User not found.',
      })
    }

    // Prepare profile data
    const profileData = {
      bio: body.bio,
      profileName: body.profileName,
      socialLinks: body.socialLinks,
      webLinks: body.webLinks,
      imageStyle: body.imageStyle,
      image: body.image,
    }

    // Create new profile
    const profile = await Profile.create(profileData)

    // Link profile to user
    user.profile = profile._id
    await user.save()

    // Send response
    res.status(StatusCodes.CREATED).json({
      data: profile,
      message: 'Profile created successfully.',
    })
  }),

  updateProfile: asyncMiddleware(async (req, res) => {
    const body = await JSON.parse(req.body.body)
    const id = body.userId
    console.log('first', req.body)
    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'User ID is required.',
      })
    }

    // Mapping of platforms to their base URLs
    const platformBaseUrls = {
      Instagram: 'https://instagram.com/',
      TikTok: 'https://www.tiktok.com/@',
      YouTube: 'https://www.youtube.com/c/',
      Facebook: 'https://facebook.com/',
      Discord: 'https://discord.gg/',
      Threads: 'https://threads.net/',
      LinkedIn: 'https://linkedin.com/in/',
      Pinterest: 'https://pinterest.com/',
      Spotify: 'https://open.spotify.com/user/',
      Snapchat: 'https://www.snapchat.com/add/',
    }

    // Validate and process socialLinks
    if (body.socialLinks && Array.isArray(body.socialLinks)) {
      const invalidPlatform = body.socialLinks.find((link) => !platformBaseUrls[link.platform])

      if (invalidPlatform) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: `Invalid platform: ${invalidPlatform.platform}.`,
        })
      }

      // Map only after validation
      body.socialLinks = body.socialLinks.map((link) => {
        const { platform, url } = link
        const baseUrl = platformBaseUrls[platform]
        return {
          platform,
          url: url.startsWith('http') ? url : `${baseUrl}${url}`,
        }
      })
    }

    // Validate and process webLinks
    if (body.webLinks && Array.isArray(body.webLinks)) {
      const invalidWebLink = body.webLinks.find((webLink) => !webLink.title || !webLink.link)

      if (invalidWebLink) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: 'Both title and link are required for all webLinks.',
        })
      }

      // Map only after validation
      body.webLinks = body.webLinks.map((webLink) => {
        const { title, link } = webLink
        return {
          title,
          link: link.startsWith('http') ? link : `https://${link}`,
        }
      })
    }

    // Add uploaded image if provided
    if (req.file) {
      body.image = req.file.path
    }

    // Find user and check existence
    const user = await User.findById(id).populate('profile').exec()
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'User not found.',
      })
    }

    // Prepare profile data
    const profileData = {
      bio: body.bio,
      profileName: body.profileName,
      socialLinks: body.socialLinks,
      webLinks: body.webLinks,
      imageStyle: body.imageStyle,
      image: body.image,
    }

    // Update or create the profile
    let profile
    if (user.profile) {
      profile = await Profile.findByIdAndUpdate(user.profile._id, profileData, {
        new: true,
      })
    } else {
      profile = await Profile.create(profileData)
      user.profile = profile._id
      await user.save()
    }

    // Send response
    res.status(StatusCodes.OK).json({
      data: profile,
      message: 'Profile updated successfully.',
    })
  }),

  getProfile: asyncMiddleware(async (req, res) => {
    const id = req.query.userId

    const user = await User.findById(id).populate('profile')
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'User not found.',
      })
    }
    res.status(StatusCodes.OK).json({
      data: user.profile,
      message: 'Profile Details Successfully Fetched',
    })
  }),
}
