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
import {
  InstaAnalytics,
  Pages,
  Portfolio,
  Audience,
  Product,
  Shop,
  TikTokAnalytics,
  User,
  YoutubeAnalytics,
  Sample,
} from '../models'

// * Middlewares
import { asyncMiddleware } from '../middlewares'

// * Services
import {
  addGroup,
  getGroupsPaginated,
  getGroupDetails,
  updateGroupDetails,
  getGroupMembersPaginated,
  createPost,
  getUserPostsPaginated,
  updatePost,
  getPostDetails,
  getgroupsPostsPaginated,
  getallPostsPaginated,
  getPostLike,
  getPostdisLike,
  createComment,
  updateComment,
  getAllComments,
  createExercise,
  getAllExercises,
  createBadge,
  getABadge,
  getAllBadge,
  updateBadge,
  createChallenge,
  updateChallenge,
  getAllZealAdminChallenges,
  getFriendsChallenges,
  getCommunityChallenges,
  getUserProgress,
  getUserExerciseLog,
  getChallengeHistory,
  getUserAllCurrentChallenges,
  getAllFeaturedChallenges,
  getUserCreatedChallenges,
  getSpecificCommunityChallenges,
  getAllPopularChallenges,
  getChallengeDetails,
  retrieveUserChallange,
  getAllExercisesCategory,
  getChallengeLeaderboard,
  getUsersPaginated,
} from '../services'

// * Utilities
import {
  DEALERSHIP_STATUS,
  DEALERSHIP_STAFF_ROLE,
  DOC_STATUS,
  getRoleByValue,
  getRoleShortName,
  USER_ROLE,
  USER_TYPES,
  AUCTION_STATUS,
  CAR_STATUS,
  SYSTEM_STAFF_ROLE,
  BID_STATUS,
  getCurrentDayName,
  getDateForDay,
  getStartOfDayISO,
  getDayName,
  CHALLENGE_STATUS,
} from '../utils/user'
import { getLoginLinkByEnv, getSanitizeCompanyName, toObjectId } from '../utils/misc'
import { stripe } from '../utils/stripe'
import Email from '../utils/email'
import { escapeRegex } from '../utils/misc'
import { comparePassword, generateOTToken, generatePassword, generateToken, verifyTOTPToken } from '../utils'
import { sendSMS } from '../utils/smsUtil'
import { getIO } from '../socket'
import { getInstagramFollowers } from '../utils/insta-acc-funcs'
import { access } from 'fs/promises'
const { ObjectId } = mongoose.Types

// const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
// const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
// const REDIRECT_URI = 'http://localhost:3000/api/user/auth/google/callback'

export const CONTROLLER_PORTFOLIO = {
  createAndUpdatePortfolio: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded
    const { name, speciality, brand, audience, sample, testimonials, contact, visibility } = req.body
    const { version = 'draft' } = req.query

    const user = await User.findById(userId)
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'User not found.',
      })
    }

    const portfolioData = {
      name,
      speciality,
      brand,
      audience,
      sample,
      testimonials,
      contact,
      visibility,
    }

    let portfolio = await Portfolio.findOne({ userId })

    if (!portfolio) {
      // Create a new portfolio if it doesn't exist
      portfolio = new Portfolio({
        userId,
        draft: portfolioData,
        published: portfolioData,
        lastPublishedAt: Date.now(),
      })
      await portfolio.save()
      user.portfolio = portfolio._id
      await user.save()
    } else {
      // Update the existing portfolio
      if (version === 'draft') {
        portfolio.draft = portfolioData
      } else if (version === 'published') {
        portfolio.published = portfolioData
      }
      portfolio.lastPublishedAt = Date.now()
      await portfolio.save()
    }

    const { draft, published, ...restPortfolio } = portfolio.toObject()
    let modifiedPortfolio

    if (version === 'draft') {
      modifiedPortfolio = {
        ...restPortfolio,
        ...draft,
      }
    } else if (version === 'published') {
      modifiedPortfolio = {
        ...restPortfolio,
        ...published,
      }
    }
    const findPages = await Pages.find({ user: userId })
    if (!findPages) {
      // If no existing page, create a new one
      const newPage = new Pages({
        user: userId,
        portfolio: portfolio._id,
      })

      await newPage.save() // Save the new page
      res.status(201).json({ message: 'Page created successfully', data: newPage })
    } else {
      // If page exists, update it
      Pages.findOneAndUpdate(
        { user: userId }, // Find criteria
        { portfolio: portfolio._id }, // Update data
        { new: true } // Return updated document
      )
    }

    res.status(StatusCodes.OK).json({
      data: modifiedPortfolio,
      message: portfolio.isNew ? 'Shop created successfully.' : 'Shop updated successfully.',
    })
  }),

  getPortfolio: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded
    const { version = 'draft' } = req.query // 'draft' or 'published'

    // Fetch and populate the portfolio data
    const portfolio = await Portfolio.findOne({ userId }).populate([
      { path: `${version}.brand.brandList`, model: 'Brand' },
      { path: `${version}.audience.audienceList`, model: 'Audience' },
      { path: `${version}.sample.categoryList`, model: 'Sample' },
      { path: `${version}.testimonials.testimonialList`, model: 'Testimonials' },
      { path: `${version}.contact.contactList`, model: 'Contact' },
    ])

    if (!portfolio) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Portfolio not found.',
      })
    }

    // Convert the Mongoose document to a plain object
    const portfolioPlain = portfolio.toObject()

    res.status(StatusCodes.OK).json({
      data: portfolioPlain,
      message: 'Portfolio retrieved successfully.',
    })
  }),

  updatePortfolio: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded
    const { version = 'draft' } = req.query // 'draft' or 'published'
    const { name, location, speciality, brand, audience, sample, testimonials, contact, visibility } = req.body

    let portfolio = await Portfolio.findOne({ userId }).lean()

    if (!portfolio) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Portfolio not found.',
      })
    }

    // Construct the update object dynamically based on the version
    const updatePath = `${version}`
    const updateData = {
      [`${updatePath}.name`]: name,
      [`${updatePath}.location`]: location,
      [`${updatePath}.speciality`]: speciality,
      [`${updatePath}.testimonials`]: testimonials,
      [`${updatePath}.contact`]: contact,
      [`${updatePath}.visibility`]: visibility,
    }

    // Update nested fields within the brand object
    if (brand) {
      updateData[`${updatePath}.brand.name`] = brand.name
      updateData[`${updatePath}.brand.visibility`] = brand.visibility
      updateData[`${updatePath}.brand.oneLiner`] = brand.oneLiner
      updateData[`${updatePath}.brand.brandList`] = brand.brandList || []
    }
    // Update nested fields within the audience object
    if (audience) {
      // Update individual Audience documents
      if (audience?.audienceList?.length) {
        for (const item of audience.audienceList) {
          const { _id, ...updates } = item
          if (_id) {
            await Audience.findByIdAndUpdate(_id, { $set: updates })
          }
        }
      }

      // set the full updated array
      updateData[`${updatePath}.audience.name`] = audience.name
      updateData[`${updatePath}.audience.visibility`] = audience.visibility
      updateData[`${updatePath}.audience.audienceList`] = audience.audienceList.map((item) => item._id)
    }

    // Update nested fields within the sample object
    if (sample && sample?.categoryList?.length) {
      for (const category of sample.categoryList) {
        const { _id, name, sampleList = [] } = category
        if (_id) {
          // Update name
          await Sample.findByIdAndUpdate(_id, { $set: { name } })

          // Update each item in sampleList by its _id
          for (const sampleItem of sampleList) {
            if (sampleItem._id) {
              await Sample.updateOne(
                { _id, 'sampleList._id': sampleItem._id },
                {
                  $set: {
                    'sampleList.$.url': sampleItem.url,
                    'sampleList.$.tile': sampleItem.tile,
                    'sampleList.$.buttonTitle': sampleItem.buttonTitle,
                    'sampleList.$.visibility': sampleItem.visibility,
                  },
                }
              )
            }
          }
        }
      }

      updateData[`${updatePath}.sample.name`] = sample.name
      updateData[`${updatePath}.sample.visibility`] = sample.visibility
      updateData[`${updatePath}.sample.categoryList`] = sample.categoryList.map((item) => item._id)
    }

    // Find and update the portfolio
    portfolio = await Portfolio.findOneAndUpdate({ userId }, { $set: updateData }, { new: true, lean: true })

    if (!portfolio) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Portfolio not found.',
      })
    }

    res.status(StatusCodes.OK).json({
      data: portfolio,
      message: 'Portfolio updated successfully.',
    })
  }),
  fbSocialAccessToken: asyncMiddleware(async (req, res) => {
    const { code } = req.query
    const authCode = decodeURIComponent(code || '').replace(/#_$/, '')
    const { _id: userId } = req.decoded // Update based on your auth system

    try {
      // 1. Exchange code for short-lived token
      const params = new URLSearchParams()
      params.append('client_id', process.env.CLIENT_ID)
      params.append('client_secret', process.env.CLIENT_SECRET)
      params.append('grant_type', 'authorization_code')
      params.append('redirect_uri', process.env.INSTAGRAM_REDIRECT_URI)
      params.append('code', authCode)

      const tokenResponse = await axios.post('https://api.instagram.com/oauth/access_token', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })

      const { access_token: shortLivedToken, user_id: instagramUserId } = tokenResponse.data

      // 2. Exchange short-lived token for long-lived token
      const longTokenRes = await axios.get('https://graph.instagram.com/access_token', {
        params: {
          grant_type: 'ig_exchange_token',
          client_secret: process.env.CLIENT_SECRET,
          access_token: shortLivedToken,
        },
      })

      const { access_token: longLivedToken, expires_in } = longTokenRes.data

      // 3. Save long-lived token to DB
      const expiryDate = new Date(Date.now() + expires_in * 1000)

      const updated = await InstaAnalytics.findOneAndUpdate(
        { userId },
        {
          userId,
          instagramUserId,
          accessToken: longLivedToken,
          longLivedToken: longLivedToken,
          longLivedTokenExpiry: expiryDate,
          lastSyncedAt: new Date(),
        },
        { upsert: true, new: true }
      )

      res.json({
        message: 'Access token retrieved and saved successfully.',
        data: {
          instagramUserId,
          accessToken: longLivedToken,
          expiresAt: expiryDate,
        },
      })
    } catch (error) {
      console.error('Instagram Auth Error:', error?.response?.data || error.message)
      res.status(500).json({ error: error.message, message: 'Error during authentication' })
    }
  }),

  InstaDetails: asyncMiddleware(async (req, res) => {
    const { user_id: instagramUserId, access_token: accessToken } = req.body
    const { _id: userId } = req.decoded

    console.log('instagramUserId', instagramUserId, accessToken, 'userId', userId)

    const isTransientError = (err) =>
      err?.response?.data?.error?.is_transient === true || err?.response?.data?.error?.code === 2

    const retryRequest = async (url, retries = 3, delay = 1000) => {
      for (let i = 0; i < retries; i++) {
        try {
          return await axios.get(url)
        } catch (err) {
          const shouldRetry = isTransientError(err)
          if (shouldRetry && i < retries - 1) {
            console.warn(`Transient error on ${url}, retrying (${i + 1}/${retries})...`)
            await new Promise((res) => setTimeout(res, delay))
          } else {
            throw err
          }
        }
      }
    }

    try {
      const followers_response = await retryRequest(
        `https://graph.instagram.com/${instagramUserId}?fields=followers_count&access_token=${accessToken}`
      )
      console.log('followers_response', followers_response.data)

      const reach = await retryRequest(
        `https://graph.instagram.com/${instagramUserId}/insights?metric=reach&period=days_28&access_token=${accessToken}`
      )
      console.log('reach', reach.data)

      const media = await retryRequest(
        `https://graph.instagram.com/${instagramUserId}/media?fields=likes_count,comments_count,media_type,media_url,permalink,like_count,share_count&access_token=${accessToken}`
      )
      console.log('media', media.data)

      const mediaData = media.data.data || []

      const totalLikes = mediaData.reduce((sum, post) => sum + (post.like_count || 0), 0)
      const totalComments = mediaData.reduce((sum, post) => sum + (post.comments_count || 0), 0)
      const totalShares = mediaData.reduce((sum, post) => sum + (post.share_count || 0), 0)
      const totalPosts = mediaData.length

      const avgLikes = totalPosts ? totalLikes / totalPosts : 0
      const avgComments = totalPosts ? totalComments / totalPosts : 0
      const avgShares = totalPosts ? totalShares / totalPosts : 0

      const totalViews = reach.data.data.reduce((sum, insight) => sum + insight.values[0].value, 0)
      const followersCount = followers_response.data.followers_count || 1
      const safeTotalLikes = totalLikes || 1
      const safeTotalComments = totalComments || 1
      const safeTotalShares = totalShares || 1
      const safeFollowers = followersCount > 0 ? followersCount : 1

      const engagementRateRaw =
        ((avgLikes / safeTotalLikes + avgComments / safeTotalComments + avgShares / safeTotalShares) / safeFollowers) *
        100

      const engagementRate = +engagementRateRaw.toFixed(2)
      const updated = await InstaAnalytics.findOneAndUpdate(
        { userId },
        {
          totalPosts,
          followersCount: followers_response.data.followers_count,
          engagementRate,
          totalViews,
          totalLikes,
          totalComments,
          totalShares,
          avgLikes,
          avgComments,
          avgShares,
          media: mediaData.map((post) => ({
            media_type: post.media_type,
            media_url: post.media_url,
            permalink: post.permalink,
            like_count: post.like_count,
            comments_count: post.comments_count,
            share_count: post.share_count || 0,
          })),
          reachBreakdown: reach.data,
          lastSyncedAt: new Date(),
        },
        { upsert: true, new: true }
      )

      res.status(StatusCodes.OK).json({
        message: 'Instagram analytics saved successfully',
        data: updated,
      })
    } catch (error) {
      console.error('Error saving Instagram analytics:', error.message)
      if (error.response) {
        console.error('Status:', error.response.status)
        console.error('Headers:', error.response.headers)
        console.error('Data:', error.response.data)
      }
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: 'Error during authentication',
        error: error.response?.data || error.message,
      })
    }
  }),

  getInstaAnalytics: asyncMiddleware(async (req, res) => {
    const { userId } = req.body

    try {
      const instaAnalytics = await InstaAnalytics.findOne({ userId })
      if (!instaAnalytics) {
        return res.status(StatusCodes.NOT_FOUND).json({
          message: 'Instagram Analytics not found.',
        })
      }
      res.status(StatusCodes.OK).json({
        data: instaAnalytics,
        message: 'Instagram Analytics retrieved successfully.',
      })
    } catch (error) {
      console.error('Error fetching channel ID:', error)
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: 'Instagram API error',
        error: {
          message: error.response?.data?.error?.message || error.message,
          code: error.response?.data?.error?.code,
          type: error.response?.data?.error?.type,
          fbtrace_id: error.response?.data?.error?.fbtrace_id,
        },
      })
    }
  }),

  fbDetails: asyncMiddleware(async (req, res) => {
    const { access_token, ig_user_id, fb_page_id } = req.body

    try {
      // 1. Follower Count
      const followersRes = await axios.get(
        `https://graph.facebook.com/v19.0/${ig_user_id}?fields=followers_count&access_token=${access_token}`
      )
      const followersCount = followersRes.data.followers_count

      // 2. Audience Demographics (Age, Gender, Location)
      const demographicsRes = await axios.get(
        `https://graph.facebook.com/v19.0/${fb_page_id}/insights?metric=page_fans_gender_age,page_fans_country&access_token=${access_token}`
      )
      const genderAge = demographicsRes.data.data.find((d) => d.name === 'page_fans_gender_age')?.values[0]?.value || {}
      const country = demographicsRes.data.data.find((d) => d.name === 'page_fans_country')?.values[0]?.value || {}

      // 3. Reach (last 28 days)
      const reachRes = await axios.get(
        `https://graph.facebook.com/v19.0/${ig_user_id}/insights?metric=reach&period=days_28&access_token=${access_token}`
      )
      const reach = reachRes.data.data[0]?.values[0]?.value || 0

      // 4. Get last 10 media
      const mediaRes = await axios.get(
        `https://graph.facebook.com/v19.0/${ig_user_id}/media?fields=id,media_type,like_count,comments_count,media_product_type&limit=10&access_token=${access_token}`
      )
      const posts = mediaRes.data.data

      let totalLikes = 0
      let totalComments = 0
      let reelsViews = 0
      let reelsWatchTime = 0
      let reelCount = 0

      for (const post of posts) {
        totalLikes += post.like_count || 0
        totalComments += post.comments_count || 0

        if (post.media_product_type === 'REELS') {
          // Fetch insights for Reels
          const insightsRes = await axios.get(
            `https://graph.facebook.com/v19.0/${post.id}/insights?metric=impressions,reach,engagement&access_token=${access_token}`
          )
          const data = insightsRes.data.data
          reelsViews += parseInt(data.find((d) => d.name === 'impressions')?.values[0]?.value || 0)
          reelsWatchTime += parseFloat(data.find((d) => d.name === 'engagement')?.values[0]?.value || 0)
          reelCount++
        }
      }

      // Calculate engagement rate
      const avgLikes = totalLikes / posts.length
      const avgComments = totalComments / posts.length
      const engagementRate = ((avgLikes + avgComments) / followersCount) * 100

      res.json({
        followersCount,
        demographics: { genderAge, country },
        reach,
        engagementRate: engagementRate.toFixed(2) + '%',
        avgLikes,
        avgComments,
        avgReelsViews: reelCount ? (reelsViews / reelCount).toFixed(2) : 0,
        avgWatchTime: reelCount ? (reelsWatchTime / reelCount).toFixed(2) : 0,
      })
    } catch (error) {
      console.error(error?.response?.data || error.message)
      res.status(500).json({ error: error?.response?.data || error.message })
    }
  }),

  fbSocialLongLiveAccessToken: asyncMiddleware(async (req, res) => {
    const { code } = req.query
    try {
      const response = await axios.get('https://graph.instagram.com/access_token', {
        params: {
          grant_type: 'ig_exchange_token',
          access_token: code,
          client_id: process.env.CLIENT_ID,
        },
      })
      console.log('Long-lived token:', response.data.access_token)
      res.json({ long_live_access_token: response.data.access_token })
    } catch (error) {
      res.status(500).send('Error during authentication')
    }
  }),
  linkedInAcessToken1: asyncMiddleware(async (req, res) => {
    const { code } = req.query
    try {
      const response = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', null, {
        params: {
          grant_type: 'authorization_code',
          code,
          redirect_uri: REDIRECT_URI,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
        },
      })
      const { access_token } = response.data
      res.json({ access_token })
    } catch (error) {
      console.error('Error during authentication:', error)
      res.status(500).send('Error during authentication')
    }
  }),
  linkedInRedirectUrl: asyncMiddleware(async (req, res) => {
    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=r_liteprofile%20r_emailaddress%20w_member_social`
    res.redirect(authUrl)
  }),

  linkedInAccessToken: asyncMiddleware(async (req, res) => {
    const { code } = req.query
    try {
      const params = new URLSearchParams()
      params.append('client_id', process.env.LINKEDIN_CLIENT_ID)
      params.append('client_secret', process.env.LINKEDIN_CLIENT_SECRET)
      params.append('grant_type', 'authorization_code')
      params.append('redirect_uri', process.env.LINKEDIN_REDIRECT_URI)
      params.append('code', code)

      const response = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })

      const response2 = await axios.get(`https://api.linkedin.com/v2/organization/${organizationId}`, {
        headers: {
          Authorization: `Bearer ${response.data.access_token}`,
          'X-RestLi-Protocol-Version': '2.0.0',
        },
        params: {
          projection: '(id,name,followerCount)',
        },
      })

      const { access_token } = response.data
      res.json({ access_token, response2 })
    } catch (error) {
      console.error('Error during authentication:', error)
      res.status(500).send('Error during authentication')
    }
  }),

  // Function to get LinkedIn page followers
  getLinkedInPageFollowers: asyncMiddleware(async (req, res) => {
    const { organizationId, personId, access_token } = req.body

    try {
      // Fetch user posts and calculate engagement metrics
      const postsResponse = await axios.get('https://api.linkedin.com/v2/ugcPosts', {
        headers: {
          Authorization: `Bearer ${access_token}`,
          'X-RestLi-Protocol-Version': '2.0.0',
        },
        params: {
          q: 'authors',
          authors: `List(urn:li:person:${personId})`,
          count: 10,
        },
      })

      const posts = postsResponse.data.elements || []
      let totalLikes = 0,
        totalComments = 0,
        totalShares = 0

      posts.forEach((post) => {
        totalLikes += post.socialDetail?.socialCounts?.likeCount || 0
        totalComments += post.socialDetail?.socialCounts?.commentCount || 0
        totalShares += post.socialDetail?.socialCounts?.shareCount || 0
      })

      const avgLikes = totalLikes / posts.length
      const avgComments = totalComments / posts.length
      const avgShares = totalShares / posts.length

      console.log('Average Likes:', avgLikes)
      console.log('Average Comments:', avgComments)
      console.log('Average Shares:', avgShares)

      res.status(200).json({ avgLikes, avgComments, avgShares })
    } catch (error) {
      console.error('Error fetching LinkedIn data:', error)
      if (error.response && error.response.status) {
        res.status(error.response.status).json({ error: error.response.data.message })
      } else {
        res.status(500).json({ error })
      }
    }
  }),

  getLinkedInData: asyncMiddleware(async (req, res) => {
    const { accessToken, organizationId } = req.body
    try {
      // Fetch organization followers
      const followersResponse = await axios.get(`https://api.linkedin.com/v2/organizations/${organizationId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-RestLi-Protocol-Version': '2.0.0',
        },
        params: {
          projection: '(id,name,followerCount)',
        },
      })

      const followerCount = followersResponse.data.followerCount
      console.log('LinkedIn Page Followers:', followerCount)

      // Fetch user posts and calculate engagement metrics
      const postsResponse = await axios.get('https://api.linkedin.com/v2/ugcPosts', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-RestLi-Protocol-Version': '2.0.0',
        },
        params: {
          q: 'authors',
          authors: 'List(urn:li:person:{personId})',
          count: 10,
        },
      })

      const posts = postsResponse.data.elements
      let totalLikes = 0,
        totalComments = 0,
        totalShares = 0

      posts.forEach((post) => {
        totalLikes += post.socialDetail?.socialCounts?.likeCount || 0
        totalComments += post.socialDetail?.socialCounts?.commentCount || 0
        totalShares += post.socialDetail?.socialCounts?.shareCount || 0
      })

      const avgLikes = totalLikes / posts.length
      const avgComments = totalComments / posts.length
      const avgShares = totalShares / posts.length

      console.log('Average Likes:', avgLikes)
      console.log('Average Comments:', avgComments)
      console.log('Average Shares:', avgShares)
      res.json({
        avgComments,
        avgLikes,
        avgShares,
        followerCount,
      })
    } catch (error) {
      console.error('Error fetching LinkedIn data:', error)
      res.json({ error })
    }
  }),

  // Youtube

  youtubeAccessToken: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded
    const { code } = req.query
    try {
      const authCode = decodeURIComponent(code)

      const params = new URLSearchParams()
      params.append('client_id', process.env.YOUTUBE_CLIENT_ID)
      params.append('client_secret', process.env.YOUTUBE_CLIENT_SECRET)
      params.append('grant_type', 'authorization_code')
      params.append('redirect_uri', process.env.YOUTUBE_REDIRECT_URI)
      params.append('code', authCode)
      params.append('access_type', 'offline')

      // Make the POST request to exchange the authorization code for an access token and refresh token
      const response = await axios.post('https://oauth2.googleapis.com/token', params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })
      const { access_token, refresh_token, expires_in, refresh_token_expires_in } = response.data

      // Calculate actual refresh token expiry date
      const refreshTokenExpiry = new Date(Date.now() + refresh_token_expires_in * 1000)

      await YoutubeAnalytics.findOneAndUpdate(
        { userId },
        {
          userId,
          accessToken: access_token,
          refreshToken: refresh_token,
          refreshTokenExpiry, // stored based on Google's response
          lastSyncedAt: new Date(),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
      // You will receive both access_token and refresh_token in the response
      res.json({
        data: response.data, // This includes access_token, refresh_token, expires_in, token_type
      })
    } catch (error) {
      console.error('Error fetching accessToken:', error.response?.data || error.message)

      // Handle 400 Bad Request errors specifically
      if (error.response?.status === 400) {
        console.error('Full Error Details:', JSON.stringify(error.response?.data, null, 2))
        return res.status(400).json({
          message: 'Invalid request parameters. Please check the channelId, dates, metrics, dimensions, and sort.',
          details: error.response?.data,
        })
      }

      // Handle other errors
      res.status(error.response?.status || 500).json({
        error: error.response?.data || error.message,
      })
    }
  }),

  youtubeAnalytics: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded
    const { refreshToken, apiKey } = req.body

    try {
      let token

      // If refreshToken is provided, exchange it for a new accessToken
      if (refreshToken) {
        const params = new URLSearchParams()
        params.append('client_id', process.env.YOUTUBE_CLIENT_ID)
        params.append('client_secret', process.env.YOUTUBE_CLIENT_SECRET)
        params.append('grant_type', 'refresh_token')
        params.append('refresh_token', refreshToken)

        // Request a new access token using the refresh token
        const response = await axios.post('https://oauth2.googleapis.com/token', params, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })

        token = response.data.access_token // Use the newly acquired access token
        console.log('New Access Token:', token)
      }

      const response = await axios.get(`https://www.googleapis.com/youtube/v3/channels?part=id&mine=true`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const channelId = response.data.items[0].id
      console.log('Channel ID:', channelId)

      const subscriber = await axios.get(
        `https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true&key=${apiKey}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      const subscriberCount = subscriber.data.items[0].statistics.subscriberCount
      console.log('Subscriber Count:', subscriberCount)

      // Validate input
      if (!token || !channelId) {
        return res.status(400).json({ message: 'Both accessToken and channelId are required.' })
      }

      // Calculate date range (last 30 days)
      const today = new Date() // Current date
      const endDate = new Date(Math.min(today, new Date())) // Cap endDate to today
      const startDate = new Date(endDate)
      startDate.setDate(endDate.getDate() - 30) // Last 30 days

      console.log('Today:', today.toISOString())
      console.log('Calculated Start Date:', startDate.toISOString())
      console.log('Calculated End Date:', endDate.toISOString())

      // Format dates as YYYY-MM-DD
      const formatDate = (date) => {
        return date.toISOString().split('T')[0]
      }

      const formattedStartDate = formatDate(startDate)
      const formattedEndDate = formatDate(endDate)

      const url = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==${channelId}&startDate=${formattedStartDate}&endDate=${formattedEndDate}&metrics=views&dimensions=day&sort=day`

      // Fetch analytics data
      const analyticsResponse = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      console.log('Analytics Data:', analyticsResponse.data)

      const subscriberUrl = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}`
      const subscriberResponse = await axios.get(subscriberUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      console.log('Subscriber Data:', subscriberResponse.data)

      const impressionsUrl = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==${channelId}&startDate=${formattedStartDate}&endDate=${formattedEndDate}&metrics=views,estimatedMinutesWatched,likes,comments,shares&dimensions=day`

      const impressionsResponse = await axios.get(impressionsUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      console.log('Impressions Data:', impressionsResponse.data)

      // Aggregating the data (Total Reach and Engagements)
      let totalViews = 0
      let totalLikes = 0
      let totalComments = 0
      let totalShares = 0
      let estimatedWatchTime = 0

      // Loop through the rows and sum the values
      impressionsResponse.data.rows.forEach((row) => {
        totalViews += row[1] // views
        estimatedWatchTime += row[2] // estimatedMinutesWatched
        totalLikes += row[3] // likes
        totalComments += row[4] // comments
        totalShares += row[5] // shares
      })

      // Calculate averages for engagements (likes, comments, shares)
      const totalDays = impressionsResponse.data.rows.length || 0
      const averageLikes = totalDays ? totalLikes / totalDays : 0
      const averageComments = totalDays ? totalComments / totalDays : 0
      const averageShares = totalDays ? totalShares / totalDays : 0
      const averageWatchTime = totalDays ? estimatedWatchTime / totalDays : 0

      const watchTimeUrl = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==${channelId}&startDate=${formattedStartDate}&endDate=${formattedEndDate}&metrics=estimatedMinutesWatched&dimensions=day`
      const watchTimeResponse = await axios.get(watchTimeUrl, {
        headers: { Authorization: `Bearer ${token}` },
      })
      console.log('Watch Time Response:', watchTimeResponse.data)

      const demographicsUrl = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==${channelId}&startDate=${formattedStartDate}&endDate=${formattedEndDate}&metrics=viewerPercentage&dimensions=ageGroup,gender`

      const demographicsResponse = await axios.get(demographicsUrl, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const countryUrl = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==${channelId}&startDate=${formattedStartDate}&endDate=${formattedEndDate}&metrics=views&dimensions=country`

      const countryResponse = await axios.get(countryUrl, {
        headers: { Authorization: `Bearer ${token}` },
      })

      await YoutubeAnalytics.findOneAndUpdate(
        { userId },
        {
          userId,
          // userEmail: userId,
          channelId,
          lastSyncedAt: new Date(),
          subscriberCount,
          // Analytics data
          totalReach: totalViews,
          totalLikes,
          totalComments,
          totalShares,
          totalEngagements: totalLikes + totalComments + totalShares,
          totalWatchTime: estimatedWatchTime,
          averageLikes,
          averageComments,
          averageShares,
          averageWatchTime,
          duration: `${impressionsResponse.data.rows.length}days`,

          // Raw + Additional
          demographics: demographicsResponse.data,
          countryStats: countryResponse.data,
          rawImpressions: impressionsResponse.data,
          rawAnalytics: analyticsResponse.data,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )

      res.json({
        data: analyticsResponse.data,
        impressions: impressionsResponse.data,
        totalReach: totalViews,
        totalLikes,
        totalComments,
        totalShares,
        totalEngagements: totalLikes + totalComments + totalShares,
        totalWatchTime: estimatedWatchTime,
        averageLikes,
        averageComments,
        averageShares,
        averageWatchTime,
        duration: `${impressionsResponse.data.rows.length}days`,
        demo: demographicsResponse.data,
        country: countryResponse.data,
      })
    } catch (error) {
      console.error('Error fetching analytics:', error.response?.data || error.message)

      // Handle 400 Bad Request errors specifically
      if (error.response?.status === 400) {
        console.error('Full Error Details:', JSON.stringify(error.response?.data, null, 2))
        return res.status(400).json({
          message: 'Invalid request parameters. Please check the channelId, dates, metrics, dimensions, and sort.',
          details: error.response?.data,
        })
      }

      // Handle other errors
      res.status(error.response?.status || 500).json({
        error: error.response?.data || error.message,
      })
    }
  }),

  youtubeSubscriber: asyncMiddleware(async (req, res) => {
    const { accessToken, apiKey } = req.body
    try {
      const response = await axios.get(
        `https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true&key=${apiKey}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )
      const subscriberCount = response.data.items[0].statistics.subscriberCount
      console.log('Subscriber Count:', subscriberCount)
      return subscriberCount
    } catch (error) {
      console.error('Error fetching subscribers count:', error)
    }
  }),
  getYoutubeAnalytics: asyncMiddleware(async (req, res) => {
    const { userId } = req.body
    try {
      const youtubeAnalytics = await YoutubeAnalytics.findOne({ userId })
      if (!youtubeAnalytics) {
        return res.status(StatusCodes.NOT_FOUND).json({
          message: 'Youtube Analytics not found.',
        })
      }
      res.status(StatusCodes.OK).json({
        data: youtubeAnalytics,
        message: 'Youtube Analytics retrieved successfully.',
      })
    } catch (error) {
      console.error('Error fetching channel ID:', error)
      res.status(500).json({ error })
    }
  }),
  youtubeApiKey: asyncMiddleware(async (req, res) => {
    const { accessToken, apiKey } = req.body
    try {
      const response = await axios.get(`https://www.googleapis.com/youtube/v3/channels?part=id&mine=true`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      const channelId = response.data.items
      console.log('Channel ID:', channelId)
      res.status(200).json({ data: response.data.items })
    } catch (error) {
      console.error('Error fetching channel ID:', error)
      res.status(500).json({ error })
    }
  }),

  // const accessToken = 'act.YRB3VcJdCmUupAX1iMIcBxjoI4O0kqFaXmuP3YXHVSDeE3QrnR6NnuufDDT7!5878.va'
  // TIKTOK
  // TIKTOK
  fetchTikTokData: asyncMiddleware(async (req, res) => {
    const { code } = req.query
    const { _id: userId } = req.decoded
    // const accessToken = 'act.YRB3VcJdCmUupAX1iMIcBxjoI4O0kqFaXmuP3YXHVSDeE3QrnR6NnuufDDT7!5878.va'
    try {
      // Step 1: Exchange code for access token
      const tokenResponse = await axios.post(
        'https://open.tiktokapis.com/v2/oauth/token/',
        new URLSearchParams({
          client_key: process.env.TIKTOK_CLIENT_KEY,
          client_secret: process.env.TIKTOK_CLIENT_SECRET,
          code: code.split('&')[0],
          grant_type: 'authorization_code',
          redirect_uri: process.env.TIKTOK_REDIRECT_URI,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      )

      const accessToken = tokenResponse.data.access_token
      const openId = tokenResponse.data.open_id

      const refreshToken = tokenResponse.data.refresh_token
      const accessTokenExpiresIn = tokenResponse.data.expires_in // in seconds
      const refreshTokenExpiresIn = tokenResponse.data.refresh_token_expires_in // also in seconds if present

      const accessTokenExpiry = new Date(Date.now() + accessTokenExpiresIn * 1000)
      const refreshTokenExpiry = refreshTokenExpiresIn ? new Date(Date.now() + refreshTokenExpiresIn * 1000) : null
      console.log('qwertyuiop[', tokenResponse.data)
      // Step 2: Fetch user profile
      const userProfileResponse = await axios.get('https://open.tiktokapis.com/v2/user/info/', {
        params: {
          fields: 'follower_count,display_name,open_id,avatar_url',
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      const userProfile = userProfileResponse.data.data
      console.log('userProfileResponse', userProfileResponse)
      console.log('userProfileResponse.data', userProfileResponse.data)
      console.log('userProfileResponse.data.user', userProfileResponse.data.user)
      // Step 3: Fetch user's videos
      const videoListResponse = await axios.post(
        'https://open.tiktokapis.com/v2/video/list/?fields=cover_image_url,id,title',
        {
          max_count: 20,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      )

      const videos = videoListResponse.data.data.videos || []
      const videoIds = videos.map((v) => v.id)

      if (videoIds.length === 0) {
        return res.status(StatusCodes.OK).json({
          message: 'No videos found',
          followers: userProfile.follower_count,
        })
      }

      // Step 4: Fetch insights for each video
      const insightsResponse = await axios.post(
        'https://open.tiktokapis.com/v2/video/query/?fields=id,title,view_count,like_count,comment_count,share_count',
        {
          filters: {
            video_ids: videoIds,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      )

      const insights = insightsResponse.data.data.videos

      // Step 5: Aggregate metrics
      const totalLikes = insights.reduce((sum, v) => sum + (v.like_count || 0), 0)
      const totalComments = insights.reduce((sum, v) => sum + (v.comment_count || 0), 0)
      const totalViews = insights.reduce((sum, v) => sum + (v.view_count || 0), 0)
      const totalShares = insights.reduce((sum, v) => sum + (v.share_count || 0), 0)

      const count = insights.length
      const avgLikes = +(totalLikes / count || 0).toFixed(2)
      const avgComments = +(totalComments / count || 0).toFixed(2)
      const avgViews = +(totalViews / count || 0).toFixed(2)
      const avgShares = +(totalShares / count || 0).toFixed(2)
      const safeFollowerCount = userProfile.follower_count > 0 ? userProfile.follower_count : 1
      const safeTotalLikes = totalLikes || 1
      const safeTotalComments = totalComments || 1
      const safeTotalShares = totalShares || 1
      const safeFollowers = userProfile.follower_count > 0 ? userProfile.follower_count : 1

      const engagementRateRaw =
        ((avgLikes / safeTotalLikes + avgComments / safeTotalComments + avgShares / safeTotalShares) / safeFollowers) *
        100

      const engagementRate = +engagementRateRaw.toFixed(2)
      console.log(' userProfile.follower_count', engagementRate, userProfile.follower_count)
      await TikTokAnalytics.findOneAndUpdate(
        { userId }, // or however you identify the user
        {
          userId,
          accessToken,
          accessTokenExpiry,
          engagementRate,
          refreshToken,
          refreshTokenExpiry,
          openId,
          avatar: userProfile.avatar_url,
          displayName: userProfile.display_name,
          followers: userProfile.follower_count,
          lastSyncedAt: new Date(),
          totalLikes,
          totalComments,
          totalShares,
          totalViews,
          avgLikes,
          avgComments,
          avgShares,
          avgViews,
          videos: insights.map((video) => ({
            id: video.id,
            title: video.title,
            view_count: video.view_count,
            like_count: video.like_count,
            comment_count: video.comment_count,
            share_count: video.share_count,
            cover_image_url: video.cover_image_url,
          })),
        },
        { upsert: true, new: true }
      )
      // Step 6: Respond with the aggregated data
      res.status(StatusCodes.OK).json({
        followers: userProfile.follower_count,
        totalLikes,
        totalComments,
        totalShares,
        totalViews,
        avgLikes,
        avgComments,
        avgShares,
        avgViews,
        videos: insights,
      })
    } catch (error) {
      console.error('Error fetching TikTok data:', error.response?.data || error.message)
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: 'Error fetching TikTok data',
        error: error.response?.data || error.message,
      })
    }
  }),
  // fetchDemographics: asyncMiddleware(async (req, res) => {
  //   const { code } = req.query
  //   console.log('working')
  //   const accessToken = '572368603db5ed1027716f397ec521fd6b5105c3'
  //   try {
  //     // const response = await axios.get('https://open.tiktokapis.com/v2/biz/account/insights/', {
  //     //   params: {
  //     //     fields: 'audience_gender,audience_age,audience_country',
  //     //   },
  //     //   headers: {
  //     //     Authorization: `Bearer ${accessToken}`,
  //     //   },
  //     // })

  //     const response = await axios.get('https://business-api.tiktok.com/open_api/v1.3/tcm/creator/authorized/', {
  //       headers: {
  //         Authorization: `Bearer ${accessToken}`,
  //         'Content-Type': 'application/json',
  //       },
  //     })
  //     console.log('Response:', response)
  //     const mydata = response.data
  //     // Step 6: Respond with the aggregated data
  //     res.status(StatusCodes.OK).json({
  //       mydata,
  //     })
  //   } catch (error) {
  //     console.error('Error fetching TikTok data:', error.response?.data || error.message)
  //     res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
  //       message: 'Error fetching TikTok data',
  //       error: error.response?.data || error.message,
  //     })
  //   }
  // }),
  fetchDemographics: asyncMiddleware(async (req, res) => {
    const { code } = req.query
    // const rawCode = decodeURIComponent(req.query.code || '')
    const cleanCode = code.split('&')[0] // Keep only the code part before any '&'
    console.log('cleanCode', cleanCode)
    try {
      // Step 2: Use Access Token to fetch demographics
      const response = await axios.get('https://business-api.tiktok.com/open_api/v1.3/tcm/creator/authorized/', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      })
      console.log('response', response)
      // const mydata = response.data
      res.status(StatusCodes.OK).json({ tokenResponse: response.data })
    } catch (error) {
      console.error('Error fetching TikTok data:', error.response?.data || error.message)
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: 'Error fetching TikTok data',
        error: error.response?.data || error.message,
      })
    }
  }),
  getTiktokAnalytics: asyncMiddleware(async (req, res) => {
    const { userId } = req.body
    try {
      const tiktokAnalytics = await TikTokAnalytics.findOne({ userId })
      if (!tiktokAnalytics) {
        return res.status(StatusCodes.NOT_FOUND).json({
          message: 'Tiktok Analytics not found.',
        })
      }
      res.status(StatusCodes.OK).json({
        data: tiktokAnalytics,
        message: 'Tiktok Analytics retrieved successfully.',
      })
    } catch (error) {
      console.error('Error fetching channel ID:', error)
      res.status(500).json({ error })
    }
  }),

  fetchInstaDemographics: async (req, res) => {
    const { code } = req.query
    const cleanCode = code.split('&')[0]
    const { _id: userId } = req.decoded // assuming you're using middleware to decode the user

    try {
      // Step 1: Get short-lived access token
      const shortTokenRes = await axios.get('https://graph.facebook.com/v22.0/oauth/access_token', {
        params: {
          client_id: process.env.FB_APP_ID,
          redirect_uri: process.env.FB_REDIRECT_URI,
          client_secret: process.env.FB_APP_SECRET,
          code: cleanCode,
        },
      })

      const shortLivedToken = shortTokenRes.data.access_token

      // Step 2: Exchange for long-lived token
      const longTokenRes = await axios.get('https://graph.facebook.com/v22.0/oauth/access_token', {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: process.env.FB_APP_ID,
          client_secret: process.env.FB_APP_SECRET,
          fb_exchange_token: shortLivedToken,
        },
      })

      const longLivedToken = longTokenRes.data.access_token
      console.log('longLivedToken', longLivedToken)
      // Step 3: Get user's pages
      const pagesRes = await axios.get('https://graph.facebook.com/v22.0/me/accounts', {
        params: {
          access_token: longLivedToken,
        },
      })
      console.log('pagesRes.data', pagesRes.data)
      const page = pagesRes.data.data[0]
      console.log('page', page)
      const pageId = page.id
      const pageAccessToken = page.access_token

      // Step 4: Get connected Instagram account ID
      const instaRes = await axios.get(`https://graph.facebook.com/v22.0/${pageId}`, {
        params: {
          fields: 'connected_instagram_account',
          access_token: pageAccessToken,
        },
      })

      const igAccountId = instaRes.data.connected_instagram_account?.id
      if (!igAccountId) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: 'Instagram business account not connected to the Facebook Page.',
        })
      }

      // Step 5: Fetch demographics
      const insightsRes = await axios.get(`https://graph.facebook.com/v22.0/${igAccountId}/insights`, {
        params: {
          metric: 'follower_demographics',
          metric_type: 'total_value',
          breakdown: 'age,gender,country',
          period: 'lifetime',
          access_token: pageAccessToken,
        },
      })

      const breakdowns = insightsRes.data.data.reduce(
        (acc, metric) => {
          if (metric.name === 'follower_demographics') {
            metric.breakdowns.forEach(({ dimension, value }) => {
              if (dimension === 'age') {
                acc.followersByAge[value.key] = value.value
              } else if (dimension === 'gender') {
                acc.followersByGender[value.key] = value.value
              } else if (dimension === 'country') {
                acc.followersByCountry[value.key] = value.value
              }
            })
          }
          return acc
        },
        { followersByAge: {}, followersByGender: {}, followersByCountry: {} }
      )

      // Step 6: Save to DB
      const updated = await InstaAnalytics.findOneAndUpdate(
        { userId },
        {
          longLivedToken,
          longLivedTokenExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // ~60 days
          followersByAge: breakdowns.followersByAge,
          followersByGender: breakdowns.followersByGender,
          followersByCountry: breakdowns.followersByCountry,
          lastSyncedAt: new Date(),
        },
        { upsert: true, new: true }
      )

      return res.status(StatusCodes.OK).json({
        message: 'Instagram demographics fetched and saved successfully',
        data: updated,
      })
    } catch (error) {
      console.error('Error:', error.response?.data || error.message)
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: 'Failed to fetch demographic insights',
        error: error.response?.data || error.message,
      })
    }
  },
}
