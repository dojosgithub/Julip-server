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
import { Pages, Portfolio, Product, Shop, User } from '../models'

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

    // Construct the update object dynamically based on the version
    const updatePath = `${version}`
    const updateData = {
      [`${updatePath}.name`]: name,
      [`${updatePath}.location`]: location,
      [`${updatePath}.speciality`]: speciality,
      [`${updatePath}.audience`]: audience,
      [`${updatePath}.sample`]: sample,
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

    // Find and update the portfolio
    let portfolio = await Portfolio.findOneAndUpdate({ userId }, { $set: updateData }, { new: true, lean: true })

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
    try {
      const params = new URLSearchParams()
      params.append('client_id', process.env.CLIENT_ID)
      params.append('client_secret', process.env.CLIENT_SECRET)
      params.append('grant_type', 'authorization_code')
      params.append('redirect_uri', process.env.REDIRECT_URI)
      params.append('code', authCode)

      const response = await axios.post('https://api.instagram.com/oauth/access_token', params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })

      const { access_token, user_id } = response.data
      // const followers = await getInstagramFollowers(user_id, access_token)
      // if (access_token && user_id) {
      //   const response = await axios.get(
      //     `https://graph.instagram.com/${user_id}?fields=followers_count&access_token=${access_token}`
      //   )
      //   console.log('follllllllllllll', response)
      // }
      res.json({ data: response.data })
    } catch (error) {
      console.error('ttttttttttt', error)
      res.status(500).json({ error, message: 'Error during authentication' })
    }
  }),
  InstaDetails: asyncMiddleware(async (req, res) => {
    const { user_id, access_token } = req.body
    try {
      const followers_response = await axios.get(
        `https://graph.instagram.com/${user_id}?fields=followers_count&access_token=${access_token}`
      )
      const reach = await axios.get(
        `https://graph.instagram.com/${user_id}/insights?metric=reach&period=days_28&access_token=${access_token}`
      )
      // const impressions = await axios.get(
      //   `https://graph.instagram.com/${user_id}/insights?metric=impressions&period=days_28&access_token=${access_token}`
      // )
      const media = await axios.get(
        `https://graph.instagram.com/${user_id}/media?fields=likes_count,comments_count,media_type,media_url,permalink,like_count,share_count&access_token=${access_token}`
      )

      // Calculating total and average for likes, comments, and shares
      const totalLikes = media.data.data.reduce((sum, post) => sum + post.like_count, 0)
      const totalComments = media.data.data.reduce((sum, post) => sum + post.comments_count, 0)
      const totalShares = media.data.data.reduce((sum, post) => sum + (post.share_count || 0), 0) // Ensure share_count exists
      const totalPosts = media.data.data.length

      const avgLikes = totalLikes / totalPosts
      const avgComments = totalComments / totalPosts
      const avgShares = totalShares / totalPosts

      // Calculating total views (reach) if applicable
      const totalViews = reach.data.data.reduce((sum, insight) => sum + insight.values[0].value, 0)

      res.status(StatusCodes.OK).json({
        followers: followers_response.data,
        reach: reach.data,
        // impressions: impressions.data.data[0].values[0].value,
        media: media.data.data,
        totalLikes,
        avgLikes,
        totalComments,
        avgComments,
        totalShares,
        avgShares,
        totalViews,
      })
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: 'Error during authentication',
        error: error.message,
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
    const { code } = req.query
    try {
      const authCode = decodeURIComponent(code)

      const params = new URLSearchParams()
      params.append('client_id', process.env.YOUTUBE_CLIENT_ID)
      params.append('client_secret', process.env.YOUTUBE_CLIENT_SECRET)
      params.append('grant_type', 'authorization_code')
      params.append('redirect_uri', process.env.LINKEDIN_REDIRECT_URI)
      params.append('code', authCode)
      params.append('access_type', 'offline')

      // Make the POST request to exchange the authorization code for an access token and refresh token
      const response = await axios.post('https://oauth2.googleapis.com/token', params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })

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

  youtubeAnalytics: asyncMiddleware(async (req, res) => {
    const { refreshToken, accessToken, apiKey, channelId } = req.body

    try {
      let token = accessToken

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

      const url = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==${channelId}&startDate=${formattedStartDate}&endDate=${formattedEndDate}&metrics=views&dimensions=day&sort=day&key=${apiKey}`

      // Fetch analytics data
      const analyticsResponse = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      console.log('Analytics Data:', analyticsResponse.data)

      const subscriberUrl = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${apiKey}`
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
      const totalDays = impressionsResponse.data.rows.length
      const averageLikes = totalLikes / totalDays
      const averageComments = totalComments / totalDays
      const averageShares = totalShares / totalDays
      const averageWatchTime = estimatedWatchTime / totalDays

      const watchTimeUrl = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==${channelId}&startDate=${formattedStartDate}&endDate=${formattedEndDate}&metrics=estimatedMinutesWatched&dimensions=day&key=${apiKey}`
      const watchTimeResponse = await axios.get(watchTimeUrl, {
        headers: { Authorization: `Bearer ${token}` },
      })
      console.log('Watch Time Response:', watchTimeResponse.data)

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

  // TIKTOK
  fetchTikTokData: asyncMiddleware(async (req, res) => {
    const { code } = req.query
    const cleanCode = code.split('&')[0]
    const accessToken = 'act.YRB3VcJdCmUupAX1iMIcBxjoI4O0kqFaXmuP3YXHVSDeE3QrnR6NnuufDDT7!5878.va'

    try {
      // Step 1: Fetch user profile
      const userProfileResponse = await axios.get('https://open.tiktokapis.com/v2/user/info/', {
        params: {
          fields: 'follower_count,display_name,open_id,avatar_url', // fields as a query string
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      const userProfile = userProfileResponse.data.data

      // Step 2: Fetch user's videos
      const videoListResponse = await axios.post(
        'https://open.tiktokapis.com/v2/video/list/?fields=cover_image_url,id,title',
        {
          max_count: 20, // You can adjust the max_count as needed
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      )

      const videos = videoListResponse.data.data.videos || []
      const videoIds = videos
        .filter((video) => video.id) // Filter out videos without an 'id'
        .map((video) => String(video.id)) // Ensure all video ids are strings

      if (videoIds.length === 0) {
        return res.status(StatusCodes.OK).json({
          message: 'No videos found',
          followers: userProfile.follower_count,
        })
      }

      // Step 3: Fetch insights for each video
      const insightsResponse = await axios.post(
        'https://open.tiktokapis.com/v2/video/query/?fields=id,title,view_count,like_count,comment_count,share_count',
        {
          filters: {
            video_ids: videoIds, // Ensure videoIds is an array like ["1234123412345678567", "1010102020203030303"]
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
      console.log(insightsResponse, 'insights', insights, 'insightsResponse')

      // Step 4: Aggregate metrics (Example: Total likes, views, etc.)
      // Uncomment and adjust based on your requirements

      const totalLikes = insights.reduce((sum, v) => sum + (v.like_count || 0), 0)
      const totalComments = insights.reduce((sum, v) => sum + (v.comment_count || 0), 0)
      const totalViews = insights.reduce((sum, v) => sum + (v.view_count || 0), 0)
      const totalShares = insights.reduce((sum, v) => sum + (v.share_count || 0), 0)

      const count = insights.length
      const avgLikes = totalLikes / count || 0
      const avgComments = totalComments / count || 0
      const avgViews = totalViews / count || 0
      const avgShares = totalShares / count || 0

      // Step 5: Respond with the aggregated data
      res.status(StatusCodes.OK).json({
        followers: userProfile.follower_count,
        // Include other aggregated metrics if needed
        totalLikes,
        totalComments,
        totalShares,
        totalViews,
        avgLikes,
        avgComments,
        avgShares,
        avgViews,
        videos: insights, // Include insights data in the response
      })
    } catch (error) {
      console.error('Error fetching TikTok data:', error.response?.data || error.message)
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: 'Error fetching TikTok data',
        error: error.response?.data || error.message,
      })
    }
  }),
}
