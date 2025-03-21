// * Libraries
import { StatusCodes } from 'http-status-codes'
import { isEmpty, isUndefined, concat, cloneDeep } from 'lodash'

import dotenv from 'dotenv'

dotenv.config()

// * Models
import { User } from '../models'

// * Middlewares
import { asyncMiddleware } from '../middlewares'


export const CONTROLLER_REFERRAL = {
  generateRefferal: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded

    // Check if the user already has a referral link
    let user = await User.findById(userId)

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'User not found' })
    }

    if (!user.referralLink) {
      // Generate and save a new referral link only if it doesn't exist
      const referralLink = `${process.env.FRONTEND_URL}/sign-up?ref=${userId}`
      user.referralLink = referralLink
      await user.save()
    }

    res.status(StatusCodes.OK).json({
      message: 'Referral link retrieved successfully',
      referralLink: user.referralLink,
    })
  }),

  getReferral: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded  

    const user = await User.findById(userId)

    if (!user || !user.referralLink) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Referral link not found' })
    }

    res.status(StatusCodes.OK).json({ referralLink: user.referralLink })
  }),
  // getPortfolio: asyncMiddleware(async (req, res) => {
  //   const { _id: userId } = req.decoded
  //   const { version = 'draft' } = req.query // 'draft' or 'published'

  //   // Fetch and populate the portfolio data
  //   const portfolio = await Portfolio.findOne({ userId }).populate([
  //     { path: `${version}.brand.brandList`, model: 'Brand' },
  //     { path: `${version}.audience.audienceList`, model: 'Audience' },
  //     { path: `${version}.sample.categoryList`, model: 'Sample' },
  //     { path: `${version}.testimonials`, model: 'Testimonials' },
  //     { path: `${version}.contact.contactList`, model: 'Contact' },
  //   ])

  //   if (!portfolio) {
  //     return res.status(StatusCodes.NOT_FOUND).json({
  //       message: 'Portfolio not found.',
  //     })
  //   }

  //   // Convert the Mongoose document to a plain object
  //   const portfolioPlain = portfolio.toObject()

  //   res.status(StatusCodes.OK).json({
  //     data: portfolioPlain,
  //     message: 'Portfolio retrieved successfully.',
  //   })
  // }),

  // updatePortfolio: asyncMiddleware(async (req, res) => {
  //   const { _id: userId } = req.decoded
  //   const { version = 'draft' } = req.query // 'draft' or 'published'
  //   const { name, speciality, brand, audience, sample, testimonials, contact, visibility } = req.body

  //   // Construct the update object dynamically based on the version
  //   const updatePath = `${version}`
  //   const updateData = {
  //     [`${updatePath}.name`]: name,
  //     [`${updatePath}.speciality`]: speciality,
  //     [`${updatePath}.audience`]: audience,
  //     [`${updatePath}.sample`]: sample,
  //     [`${updatePath}.testimonials`]: testimonials,
  //     [`${updatePath}.contact`]: contact,
  //     [`${updatePath}.visibility`]: visibility,
  //   }

  //   // Update nested fields within the brand object
  //   if (brand) {
  //     updateData[`${updatePath}.brand.name`] = brand.name
  //     updateData[`${updatePath}.brand.visibility`] = brand.visibility
  //     updateData[`${updatePath}.brand.oneLiner`] = brand.oneLiner
  //     updateData[`${updatePath}.brand.brandList`] = brand.brandList || []
  //   }

  //   // Find and update the portfolio
  //   let portfolio = await Portfolio.findOneAndUpdate({ userId }, { $set: updateData }, { new: true, lean: true })

  //   if (!portfolio) {
  //     return res.status(StatusCodes.NOT_FOUND).json({
  //       message: 'Portfolio not found.',
  //     })
  //   }

  //   res.status(StatusCodes.OK).json({
  //     data: portfolio,
  //     message: 'Portfolio updated successfully.',
  //   })
  // }),
  // fbSocialCallback: asyncMiddleware(async (req, res) => {
  //   const { code } = req.query
  //   try {
  //     const tokenResponse = await axios.post(`https://api.instagram.com/oauth/access_token`, {
  //       client_id: process.env.CLIENT_ID,
  //       client_secret: process.env.CLIENT_SECRET,
  //       grant_type: 'authorization_code',
  //       redirect_uri: process.env.REDIRECT_URI,
  //       code,
  //     })
  //     const { access_token, user_id } = tokenResponse.data
  //     res.json({ access_token, user_id })
  //   } catch (error) {
  //     res.status(500).send('Error fetching access token')
  //   }
  //   res.status(StatusCodes.OK).json({
  //     message: 'hoo gaya successfully.',
  //   })
  // }),
  // fbSocialAccessToken: asyncMiddleware(async (req, res) => {
  //   const { code } = req.query
  //   console.log('CLIENT_ID:', process.env.CLIENT_ID)
  //   console.log('CLIENT_SECRET:', process.env.CLIENT_SECRET)
  //   console.log('REDIRECT_URI:', process.env.REDIRECT_URI)
  //   try {
  //     const params = new URLSearchParams()
  //     params.append('client_id', process.env.CLIENT_ID)
  //     params.append('client_secret', process.env.CLIENT_SECRET)
  //     params.append('grant_type', 'authorization_code')
  //     params.append('redirect_uri', process.env.REDIRECT_URI)
  //     params.append('code', code)

  //     const response = await axios.post('https://api.instagram.com/oauth/access_token', params, {
  //       headers: {
  //         'Content-Type': 'application/x-www-form-urlencoded',
  //       },
  //     })

  //     const { access_token, user_id } = response.data
  //     // const followers = await getInstagramFollowers(user_id, access_token)
  //     if (access_token && user_id) {
  //       const response = await axios.get(
  //         `https://graph.instagram.com/${user_id}?fields=followers_count&access_token=${access_token}`
  //       )
  //       console.log('follllllllllllll', response)
  //     }
  //     res.json({ data: response.data })
  //   } catch (error) {
  //     console.error('ttttttttttt', error)
  //     res.status(500).json({ error, message: 'Error during authentication' })
  //   }
  // }),
  // fbDetails: asyncMiddleware(async (req, res) => {
  //   const { user_id, access_token } = req.body
  //   try {
  //     const followers_response = await axios.get(
  //       `https://graph.instagram.com/${user_id}?fields=followers_count&access_token=${access_token}`
  //     )
  //     const reach = await axios.get(
  //       `https://graph.instagram.com/${user_id}/insights?metric=reach&period=days_28&access_token=${access_token}`
  //     )
  //     // const impressions = await axios.get(
  //     //   `https://graph.instagram.com/${user_id}/insights?metric=impressions&period=days_28&access_token=${access_token}`
  //     // )
  //     const media = await axios.get(
  //       `https://graph.instagram.com/${user_id}/media?fields=likes_count,comments_count,media_type,media_url,permalink&access_token=${access_token}`
  //     )
  //     res.status(StatusCodes.OK).json({
  //       followers: followers_response.data,
  //       reach: reach.data,
  //       // impressions: impressions.data.data[0].values[0].value,
  //       media: media.data.data,
  //     })
  //   } catch (error) {
  //     res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
  //       message: 'Error during authentication',
  //       error: error.message,
  //     })
  //   }
  // }),
  // fbSocialLongLiveAccessToken: asyncMiddleware(async (req, res) => {
  //   const { code } = req.query
  //   try {
  //     const response = await axios.get('https://graph.instagram.com/access_token', {
  //       params: {
  //         grant_type: 'ig_exchange_token',
  //         access_token: code,
  //         client_id: process.env.CLIENT_ID,
  //       },
  //     })
  //     console.log('Long-lived token:', response.data.access_token)
  //     res.json({ long_live_access_token: response.data.access_token })
  //   } catch (error) {
  //     res.status(500).send('Error during authentication')
  //   }
  // }),
}
