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

    const user = await User.findById(userId)
    if (version === 'draft') user.popupTracking.saveDraft = true
    else if (version === 'published') user.popupTracking.savePublish = true
    await user.save()

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

      // Step 1: Get Access Token using Refresh Token
      if (refreshToken) {
        const params = new URLSearchParams()
        params.append('client_id', process.env.YOUTUBE_CLIENT_ID)
        params.append('client_secret', process.env.YOUTUBE_CLIENT_SECRET)
        params.append('grant_type', 'refresh_token')
        params.append('refresh_token', refreshToken)

        const response = await axios.post('https://oauth2.googleapis.com/token', params, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })

        token = response.data.access_token
        console.log('New Access Token:', token)
      }

      // Step 2: Get Channel ID
      const response = await axios.get(`https://www.googleapis.com/youtube/v3/channels?part=id&mine=true`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const channelId = response.data.items[0].id

      // Step 3: Get Subscriber Count
      const subscriber = await axios.get(
        `https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true&key=${apiKey}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const subscriberCount = subscriber.data.items[0].statistics.subscriberCount

      if (!token || !channelId) {
        return res.status(400).json({ message: 'Both accessToken and channelId are required.' })
      }

      // Step 4: Date Range (last 30 days)
      const today = new Date()
      const endDate = new Date(Math.min(today, new Date()))
      const startDate = new Date(endDate)
      startDate.setDate(endDate.getDate() - 30)

      const formatDate = (date) => date.toISOString().split('T')[0]
      const formattedStartDate = formatDate(startDate)
      const formattedEndDate = formatDate(endDate)

      // Step 5: Fetch Daily Analytics
      const analyticsResponse = await axios.get(
        `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==${channelId}&startDate=${formattedStartDate}&endDate=${formattedEndDate}&metrics=views&dimensions=day&sort=day`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      const impressionsUrl = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==${channelId}&startDate=${formattedStartDate}&endDate=${formattedEndDate}&metrics=views,estimatedMinutesWatched,likes,comments,shares&dimensions=day`
      const impressionsResponse = await axios.get(impressionsUrl, {
        headers: { Authorization: `Bearer ${token}` },
      })

      // Step 6: Aggregate Metrics (using non-negative values)
      let totalViews = 0,
        totalLikes = 0,
        totalComments = 0,
        totalShares = 0,
        estimatedWatchTime = 0
      impressionsResponse.data.rows.forEach((row) => {
        totalViews += row[1]
        estimatedWatchTime += row[2]
        totalLikes += Math.max(0, row[3])
        totalComments += Math.max(0, row[4])
        totalShares += Math.max(0, row[5])
      })

      const totalEngagements = totalLikes + totalComments + totalShares
      const engagementRate = totalViews ? (totalEngagements / totalViews) * 100 : 0
      const totalDays = impressionsResponse.data.rows.length || 0
      const averageLikes = totalDays ? totalLikes / totalDays : 0
      const averageComments = totalDays ? totalComments / totalDays : 0
      const averageShares = totalDays ? totalShares / totalDays : 0
      const averageWatchTime = totalDays ? estimatedWatchTime / totalDays : 0

      // Step 7: Demographics (since beginning)
      const demographicsResponse = await axios.get(
        `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==${channelId}&startDate=2006-01-01&endDate=${formattedEndDate}&metrics=viewerPercentage&dimensions=ageGroup,gender`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      // Step 8: Country Stats as Percentages
      const demographicsStartDate = new Date()
      demographicsStartDate.setDate(endDate.getDate() - 60)
      const formattedDemographicsStartDate = formatDate(demographicsStartDate)
      const countryResponse = await axios.get(
        `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==${channelId}&startDate=${formattedDemographicsStartDate}&endDate=${formattedEndDate}&metrics=views&dimensions=country`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      const countryRows = countryResponse.data?.rows || []
      const totalCountryViews = countryRows.reduce((sum, row) => sum + row[1], 0)
      const countryStats = countryRows.map(([code, views]) => ({
        country: code,
        views,
        percentage: totalCountryViews ? ((views / totalCountryViews) * 100).toFixed(2) : '0.00',
      }))

      // Step 9: Save to Database
      const dataToSave = {
        userId,
        channelId,
        lastSyncedAt: new Date(),
        subscriberCount,
        totalViews,
        totalLikes,
        totalComments,
        totalShares,
        totalEngagements,
        engagementRate,
        totalWatchTime: estimatedWatchTime,
        averageLikes,
        averageComments,
        averageShares,
        averageWatchTime,
        duration: `${totalDays}days`,
        demographics: demographicsResponse.data,
        countryStats,
        rawImpressions: impressionsResponse.data,
        rawAnalytics: analyticsResponse.data,
      }

      const userPortfolio = await Portfolio.findOne({ userId: userId }).lean()
      const audienceId =
        userPortfolio?.draft?.audience?.audienceList?.[userPortfolio.draft.audience.audienceList.length - 1]
      let youtubePlatform = await Audience.findById(audienceId)

      if (!youtubePlatform) {
        return res.status(404).json({
          message: 'Audience record not found.',
          conditions: {
            audienceId,
            userPortfolio: !!userPortfolio,
            userPortfolioAudience: !!userPortfolio?.draft?.audience,
            userPortfolioAudienceAudienceList: userPortfolio?.draft?.audience?.audienceList,
            userPortfolioAudienceAudienceListLength: userPortfolio?.draft?.audience?.audienceList?.length ?? null,
          },
        })
      }

      youtubePlatform.engagements = [
        { label: 'Subscribers', visibility: true },
        { label: 'Engagement', visibility: true },
        { label: `${totalDays} Day Views`, visibility: true },
        { label: `${totalDays} Day Reach`, visibility: true },
        { label: `Avg Likes`, visibility: true },
        { label: `Avg Comments`, visibility: true },
        { label: `Avg Reels Views`, visibility: true },
        { label: `Avg Reels Watch Time`, visibility: true },
      ]

      await youtubePlatform.save()

      console.log('Saving analytics for channel:', channelId)

      await YoutubeAnalytics.findOneAndUpdate({ userId }, dataToSave, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      })
      const upatedPortfolio = await Portfolio.findOne({ userId }).populate({
        path: `draft.audience.audienceList`,
        model: 'Audience',
      })

      // Step 10: Respond with analytics
      res.json({ dataToSave, upatedPortfolio })
    } catch (error) {
      console.error('Error fetching analytics:', error.response?.data || error.message)
      if (error.response?.status === 400) {
        return res.status(400).json({
          message: 'Invalid request parameters. Please check the channelId, dates, metrics, dimensions, and sort.',
          details: error.response?.data,
        })
      }
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
  //Youtube Analytics
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
      console.log('userProfileResponse.data', userProfileResponse.data.data.user.follower_count)
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
      const safeFollowerCount =
        userProfileResponse.data.data.user.follower_count > 0 ? userProfileResponse.data.data.user.follower_count : 1

      const safeTotalLikes = isNaN(totalLikes) ? 0 : totalLikes
      const safeTotalComments = isNaN(totalComments) ? 0 : totalComments
      const safeTotalShares = isNaN(totalShares) ? 0 : totalShares
      const engagementRateRaw =
        ((avgLikes / (safeTotalLikes || 1) +
          avgComments / (safeTotalComments || 1) +
          avgShares / (safeTotalShares || 1)) /
          safeFollowerCount) *
        100

      const engagementRate = isNaN(engagementRateRaw) ? 0 : +engagementRateRaw.toFixed(2)
      console.log(' userProfile.follower_count', engagementRate, userProfile.follower_count)

      // const demographics = await axios.get('https://open.tiktokapis.com/v2/insight/audience/', {
      //   params: {
      //     start_date: '2024-04-01',
      //     end_date: '2024-04-30',
      //     metrics: 'age,gender,country',
      //   },
      //   headers: {
      //     Authorization: `Bearer ${accessToken}`,
      //     'Content-Type': 'application/json',
      //   },
      // })

      // const demographicsResponse = demographics.data
      // console.log('demographicsResponse', demographicsResponse)
      // // Save or transform as needed
      // res.status(200).json({
      //   message: 'TikTok demographics fetched successfully',
      //   data,
      // })
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
          avatar: userProfileResponse.data.data.user.avatar_url,
          displayName: userProfileResponse.data.data.user.display_name,
          followers: userProfileResponse.data.data.user.follower_count,
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
        avatar: userProfileResponse.data.data.user.avatar_url,
        displayName: userProfileResponse.data.data.user.display_name,
        followers: userProfileResponse.data.data.user.follower_count,
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
          client_id: '1363115408334174',
          client_secret: '68a3da17413addbccea98e288e1e248f',
          redirect_uri: 'https://dev.myjulip.com/auth/jwt/onboarding/',
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

  //////////////////////////////////////////////////// newest insta details////////////////////////////
  fbSocialAccessToken2: asyncMiddleware(async (req, res) => {
    const { code } = req.query
    const authCode = decodeURIComponent(code || '').split('#')[0] // ✅ Clean trailing fragments
    const { _id: userId } = req.decoded

    try {
      // Step 1: Exchange code for access token
      const tokenResponse = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
        params: {
          code: authCode,
        },
      })

      const { access_token: userToken } = tokenResponse.data

      // Step 2: Get user's pages
      const pagesRes = await axios.get(`https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token`, {
        headers: { Authorization: `Bearer ${userToken}` },
      })

      const pages = pagesRes.data.data || []
      let instagramId = null
      let pageAccessToken = null

      for (const page of pages) {
        try {
          const igRes = await axios.get(
            `https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account`,
            {
              headers: { Authorization: `Bearer ${page.access_token}` },
            }
          )

          if (igRes.data.instagram_business_account?.id) {
            instagramId = igRes.data.instagram_business_account.id
            pageAccessToken = page.access_token
            break
          }
        } catch (_) {
          continue
        }
      }

      if (!instagramId || !pageAccessToken) {
        return res.status(400).json({ message: 'Instagram Business Account not found or missing permissions.' })
      }

      const updated = await InstaAnalytics.findOneAndUpdate(
        { userId },
        {
          userId,
          instagramUserId: instagramId,
          accessToken: pageAccessToken,
          longLivedToken: userToken,
          longLivedTokenExpiry: null,
          lastSyncedAt: new Date(),
        },
        { upsert: true, new: true }
      )

      req.body = { user_id: instagramId, access_token: pageAccessToken }
      res.status(StatusCodes.OK).json({ pages, instagramId, pageAccessToken })
    } catch (error) {
      console.error('Instagram Auth Error:', error?.response?.data || error.message)
      res.status(500).json({ error: error.message, message: 'Error during authentication' })
    }
  }),

  InstaDetails2: asyncMiddleware(async (req, res) => {
    const { user_id: instagramUserId, access_token: accessToken } = req.body
    const { _id: userId } = req.decoded

    const headers = { Authorization: `Bearer ${accessToken}` }
    const IG_ID = instagramUserId

    const retryRequest = async (url, customHeaders = headers, retries = 3, delay = 1000) => {
      for (let i = 0; i < retries; i++) {
        try {
          return await axios.get(url, { headers: customHeaders })
        } catch (err) {
          const isTransient = err?.response?.data?.error?.is_transient || err?.response?.data?.error?.code === 2
          if (isTransient && i < retries - 1) {
            await new Promise((res) => setTimeout(res, delay))
          } else {
            throw err
          }
        }
      }
    }

    try {
      const profile = await retryRequest(
        `https://graph.facebook.com/v19.0/${IG_ID}?fields=name,username,followers_count,media_count`
      )
      const followersCount = profile.data.followers_count || 1

      const reach = await retryRequest(`https://graph.facebook.com/v19.0/${IG_ID}/insights?metric=reach&period=day`)
      const profileViews = await retryRequest(
        `https://graph.facebook.com/v19.0/${IG_ID}/insights?metric=profile_views&period=day&metric_type=total_value`
      )

      let audienceGenderAge = null
      let audienceCountry = null
      let audienceCity = null

      try {
        audienceGenderAge = await retryRequest(
          `https://graph.facebook.com/v19.0/${IG_ID}/insights?metric=engaged_audience_demographics&period=days_28&metric_type=total_value&breakdown=gender,age`
        )
      } catch (err) {
        console.warn('audience_gender_age not available:', err.response?.data?.error?.message)
      }

      try {
        audienceCountry = await retryRequest(
          `https://graph.facebook.com/v19.0/${IG_ID}/insights?metric=reached_audience_demographics&period=days_28&metric_type=total_value&breakdown=country`
        )
      } catch (err) {
        console.warn('audience_country not available:', err.response?.data?.error?.message)
      }

      try {
        audienceCity = await retryRequest(
          `https://graph.facebook.com/v19.0/${IG_ID}/insights?metric=follower_demographics&period=days_28&metric_type=total_value&breakdown=city`
        )
      } catch (err) {
        console.warn('audience_city not available:', err.response?.data?.error?.message)
      }

      const mediaData = []
      let nextUrl = `https://graph.facebook.com/v19.0/${IG_ID}/media?fields=id,like_count,comments_count,media_type,media_url,permalink,share_count&limit=25`

      while (nextUrl) {
        const mediaRes = await retryRequest(nextUrl)
        const items = mediaRes.data?.data || []
        mediaData.push(...items)
        nextUrl = mediaRes.data?.paging?.next || null
      }

      const totalLikes = mediaData.reduce((sum, post) => sum + (post.like_count || 0), 0)
      const totalComments = mediaData.reduce((sum, post) => sum + (post.comments_count || 0), 0)
      const totalShares = mediaData.reduce((sum, post) => sum + (post.share_count || 0), 0)
      const totalPosts = mediaData.length

      const avgLikes = totalPosts ? totalLikes / totalPosts : 0
      const avgComments = totalPosts ? totalComments / totalPosts : 0
      const avgShares = totalPosts ? totalShares / totalPosts : 0

      const totalViews = reach.data.data.reduce((sum, insight) => sum + insight.values[0].value, 0)
      const safeFollowers = followersCount || 1

      const engagementRate = +(((avgLikes + avgComments + avgShares) / safeFollowers) * 100).toFixed(2)

      const updated = await InstaAnalytics.findOneAndUpdate(
        { userId },
        {
          userId,
          instagramUserId: IG_ID,
          followersCount,
          totalPosts,
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
          profileViews: profileViews.data?.data || [],
          audienceGenderAge: audienceGenderAge?.data?.data || [],
          audienceCountry: audienceCountry?.data?.data || [],
          audienceCity: audienceCity?.data?.data || [],
          reachBreakdown: reach.data.data,
          lastSyncedAt: new Date(),
        },
        { upsert: true, new: true }
      )

      res.status(StatusCodes.OK).json({
        message: 'Instagram analytics saved successfully',
        data: updated,
      })
    } catch (error) {
      console.error('Instagram analytics error:', error.message)
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: 'Error while fetching Instagram analytics',
        error: error.response?.data || error.message,
      })
    }
  }),

  fbInstaAnalyticsHandler: asyncMiddleware(async (req, res) => {
    const { code } = req.query
    const authCode = decodeURIComponent(code || '').split('#')[0]
    const { _id: userId } = req.decoded

    try {
      // STEP 1: Get user access token from auth code
      const tokenResponse = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
        params: {
          client_id: '1718472132086479',
          client_secret: '30cbe664787298c17642454aa9709cfc',
          redirect_uri: 'https://dev.myjulip.com/dashboard/pages',
          code: authCode,
        },
      })

      const userToken = tokenResponse.data.access_token
      console.log('oooooooooooooooooooooooooppppppppp', userToken)
      // STEP 2: Fetch pages with access tokens

      // const businesses = await axios.get('https://graph.facebook.com/v19.0/me/businesses', {
      //   headers: { Authorization: `Bearer ${userToken}` },
      // })
      // console.log('businessessssssssssss', businesses)
      // const businessId = businesses.data?.data?.[0]?.id // or loop to find correct one

      const pagesRes = await axios.get('https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token', {
        headers: { Authorization: `Bearer ${userToken}` },
      })

      const pages = pagesRes.data?.data || []
      console.log('pagessssssssssss', pagesRes.data)
      // Try to find your specific page
      const targetPage = pages[0]
      if (!targetPage) {
        return res
          .status(400)
          .json({ availablePages: pages, message: 'Julip Facebook Page not found or not granted access.' })
      }

      // STEP 3: Get IG business account from that page
      const igRes = await axios.get(
        `https://graph.facebook.com/v19.0/${targetPage.id}?fields=instagram_business_account`,
        { headers: { Authorization: `Bearer ${targetPage.access_token}` } }
      )

      const instagramId = igRes.data.instagram_business_account?.id
      const pageAccessToken = targetPage.access_token

      if (!instagramId || !pageAccessToken) {
        return res.status(400).json({ message: 'Instagram Business Account not linked or missing permissions.' })
      }

      // Retry utility
      const retryRequest = async (url, retries = 3, delay = 1000) => {
        for (let i = 0; i < retries; i++) {
          try {
            return await axios.get(url, { headers: { Authorization: `Bearer ${pageAccessToken}` } })
          } catch (err) {
            const isTransient = err?.response?.data?.error?.is_transient || err?.response?.data?.error?.code === 2
            if (isTransient && i < retries - 1) await new Promise((res) => setTimeout(res, delay))
            else throw err
          }
        }
      }

      // STEP 4: Fetch profile + insights
      const IG_ID = instagramId

      const profile = await retryRequest(
        `https://graph.facebook.com/v19.0/${IG_ID}?fields=name,username,followers_count,media_count`
      )
      const followersCount = profile.data.followers_count || 1

      const today = Math.floor(Date.now() / 1000)
      const thirtyDaysAgo = today - 60 * 60 * 24 * 30

      const reach = await retryRequest(
        `https://graph.facebook.com/v19.0/${IG_ID}/insights?metric=reach&period=day&since=${thirtyDaysAgo}&until=${today}`
      )
      const reachValues = reach.data.data?.[0]?.values || []
      const totalReach = reachValues.reduce((sum, entry) => sum + (entry.value || 0), 0)

      const profileViews = await retryRequest(
        `https://graph.facebook.com/v19.0/${IG_ID}/insights?metric=profile_views&period=day&metric_type=total_value`
      )

      let audienceGenderAge = null
      let audienceCountry = null
      let audienceCity = null

      try {
        audienceGenderAge = await retryRequest(
          `https://graph.facebook.com/v19.0/${IG_ID}/insights?metric=engaged_audience_demographics&period=lifetime&timeframe=this_month&metric_type=total_value&breakdown=gender,age`
        )
      } catch (err) {
        console.warn('audience_gender_age not available:', err.response?.data?.error?.message)
      }

      try {
        audienceCountry = await retryRequest(
          `https://graph.facebook.com/v19.0/${IG_ID}/insights?metric=reached_audience_demographics&period=lifetime&timeframe=this_month&metric_type=total_value&breakdown=country`
        )
      } catch (err) {
        console.warn('audience_country not available:', err.response?.data?.error?.message)
      }

      try {
        audienceCity = await retryRequest(
          `https://graph.facebook.com/v19.0/${IG_ID}/insights?metric=follower_demographics&period=lifetime&metric_type=total_value&breakdown=city`
        )
      } catch (err) {
        console.warn('audience_city not available:', err.response?.data?.error?.message)
      }
      console.log(
        'audienceCity ➤',
        JSON.stringify(audienceCity.data?.data?.[0]?.total_value, null, 2),
        '\naudienceCountry ➤',
        JSON.stringify(audienceCountry.data?.data?.[0]?.total_value, null, 2),
        '\naudienceGenderAge ➤  ',
        JSON.stringify(audienceGenderAge.data?.data?.[0]?.total_value, null, 2)
      )
      // STEP 5: Fetch media and their metrics
      const mediaData = []
      let nextUrl = `https://graph.facebook.com/v19.0/${IG_ID}/media?fields=id,like_count,comments_count,media_type,media_url,permalink,share_count&limit=100`

      while (nextUrl) {
        const mediaRes = await retryRequest(nextUrl)
        const items = mediaRes.data?.data || []
        mediaData.push(...items)
        nextUrl = mediaRes.data?.paging?.next || null
      }

      const CONCURRENCY_LIMIT = 10
      const chunkArray = (arr, size) =>
        Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size))

      const mediaChunks = chunkArray(mediaData, CONCURRENCY_LIMIT)
      let validPosts = 0
      for (const chunk of mediaChunks) {
        await Promise.allSettled(
          chunk.map(async (post) => {
            try {
              const insightRes = await retryRequest(`https://graph.facebook.com/v19.0/${post.id}/insights?metric=reach`)
              post.reach = insightRes.data?.data?.[0]?.values?.[0]?.value || 0
              validPosts++
            } catch (_) {
              post.reach = 0
            }
          })
        )
      }

      const totalViews = mediaData.reduce((sum, post) => sum + (post.reach || 0), 0)
      const totalLikes = mediaData.reduce((sum, post) => sum + (post.like_count || 0), 0)
      const totalComments = mediaData.reduce((sum, post) => sum + (post.comments_count || 0), 0)
      const totalShares = mediaData.reduce((sum, post) => sum + (post.share_count || 0), 0)
      const totalPosts = mediaData.length

      const avgLikes = totalPosts ? totalLikes / totalPosts : 0
      const avgComments = totalPosts ? totalComments / totalPosts : 0
      const avgShares = totalPosts ? totalShares / totalPosts : 0

      const engagementRate = +(((avgLikes + avgComments + avgShares) / totalViews) * 100).toFixed(2)

      // youtube working
      const userPortfolio = await Portfolio.findOne({ userId: userId }).lean()
      const audienceId =
        userPortfolio?.draft?.audience?.audienceList?.[userPortfolio.draft.audience.audienceList.length - 1]
      let instaPlatform = await Audience.findById(audienceId)

      if (!instaPlatform) {
        return res.status(404).json({
          message: 'Audience record not found.',
          conditions: {
            audienceId,
            userPortfolio: !!userPortfolio,
            userPortfolioAudience: !!userPortfolio?.draft?.audience,
            userPortfolioAudienceAudienceList: userPortfolio?.draft?.audience?.audienceList,
            userPortfolioAudienceAudienceListLength: userPortfolio?.draft?.audience?.audienceList?.length ?? null,
          },
        })
      }

      instaPlatform.engagements = [
        { label: 'Followers', visibility: true },
        { label: 'Engagement', visibility: true },
        { label: `Total Impressions (${totalPosts} Posts)`, visibility: true },
        { label: `Total Reach (30 Day)`, visibility: true },
        { label: `Avg Likes (${totalPosts} Posts)`, visibility: true },
        { label: `Avg Comments (${totalPosts} Posts)`, visibility: true },
        { label: 'Total Likes', visibility: true },
        { label: 'Total Comments', visibility: true },
      ]

      await instaPlatform.save()

      const updated = await InstaAnalytics.findOneAndUpdate(
        { userId },
        {
          userId,
          numberOfPosts: validPosts,
          instagramUserId: IG_ID,
          accessToken: pageAccessToken,
          longLivedToken: userToken,
          longLivedTokenExpiry: null,
          lastSyncedAt: new Date(),
          followersCount,
          avgViews: totalViews / totalPosts || 0,
          totalPosts,
          engagementRate,
          impressions: totalViews,
          totalLikes,
          totalComments,
          totalShares,
          avgLikes,
          avgComments,
          avgShares,
          profileViews: profileViews.data?.data || [],
          audienceGenderAge: audienceGenderAge.data?.data?.[0]?.total_value || [],
          audienceCountry: audienceCountry.data?.data?.[0]?.total_value || [],
          audienceCity: audienceCity.data?.data?.[0]?.total_value || [],
          reachBreakdown: reach.data.data,
          totalReach30Days: totalReach,
        },
        { upsert: true, new: true }
      )

      res.status(StatusCodes.OK).json({
        message: 'Instagram analytics fetched and saved successfully',
        data: updated,
      })
    } catch (error) {
      console.error('Facebook/Instagram Auth + Analytics Error:', error?.response?.data || error.message)
      res.status(500).json({
        error: error.message,
        message: 'Failed to authenticate or fetch analytics',
      })
    }
  }),
}
