// Using ES6 module import syntax
import { schedule } from 'node-cron'
import { AUCTION_STATUS, CAR_STATUS, SYSTEM_STAFF_ROLE, USER_TYPES } from './user'
import Email from '../utils/email'
import { Notification } from '../models/Notifications'
import { toObjectId } from './misc'
import {
  Comment,
  Group,
  Post,
  User,
  Badge,
  Product,
  Subscription,
  YoutubeAnalytics,
  TikTokAnalytics,
  InstaAnalytics,
} from '../models'
import { sendPushNotification } from './pushNotification'
import { calculateAverage, getInstagramFollowers, getInstagramInsights, getInstagramMedia } from './insta-acc-funcs'
import { fetchAndSaveTikTokAnalytics } from './tiktok-analytics'
import { fetchYouTubeAnalytics } from './youtube-analytics'
import { updateInstagramAnalyticsForUser } from './insta-analytics'

// "0 0 * * 0", Every sunday at 00:00 - Required
// "59 14 * * 1", Every monday at 14:59
// "* * * * * *", Every second
// "* * * * *", Every minute
// 0 0 0 * * *, Every Midnight
// 0 0 * * *, every 24 hour

// Define the task using ES6 arrow function syntax
export const task = schedule(
  '0 0 0 * * *', // Every 24 hours
  // '* * * * *', // Every 1 minute
  () => {
    // if (process.env.NODE_ENV) automatedEmails()
    console.log('CRON JOB RUNNING!!!')
    productsToDelete()
    sendTrialEmails()
    deleteUnverifiedUsers()
  },
  { timezone: 'America/New_York' }
)

export const instaschedule = schedule('0 22 * * *', async () => await syncInstaCronJob(), {
  timezone: 'America/New_York',
})

// YouTube sync every day at 2 AM
export const youtubeschedule = schedule('0 23 * * *', async () => await syncYouTubeCronJob(), {
  timezone: 'America/New_York',
})

// TikTok sync every 12 hours
export const tiktokschedule = schedule('0 0 * * *', async () => await syncTiktokCronJob(), {
  timezone: 'America/New_York',
})

async function productsToDelete() {
  try {
    // Find all products marked for deletion and whose deletion timestamp is in the past
    const productsToDelete = await Product.find({ markedForDeletion: true, deletionTimestamp: { $lte: new Date() } })

    // Delete these products
    await Product.deleteMany({ _id: { $in: productsToDelete.map((product) => product._id) } })

    console.log('Scheduled deletion completed.')
  } catch (error) {
    console.error('Scheduled deletion error:', error)
  }
}

async function sendTrialEmails() {
  try {
    const trialingSubscriptions = await Subscription.find({ status: 'trialing' }).populate('user')
    const today = new Date()

    for (const subscription of trialingSubscriptions) {
      const { trialEndDate, user } = subscription

      if (!trialEndDate || !user) continue

      // Assume 14-day trial: Calculate start date from trialEndDate
      const trialStartDate = new Date(trialEndDate)
      trialStartDate.setDate(trialEndDate.getDate() - 14)

      const diffInMs = today - trialStartDate
      const trialDay = Math.floor(diffInMs / (1000 * 60 * 60 * 24)) + 1

      if (trialDay < 1 || trialDay > 14) continue // Skip if outside trial window

      const { email, fullName } = user
      const sendEmail = new Email({ email })
      const emailProps = { firstName: fullName }

      switch (trialDay) {
        case 3:
          await sendEmail.trialDay3(emailProps)
          break
        case 5:
          await sendEmail.trialDay5(emailProps)
          break
        case 10:
          await sendEmail.trialDay10(emailProps)
          break
        case 12:
          await sendEmail.trialDay12(emailProps)
          break
        case 13:
          await sendEmail.trialDay13(emailProps)
          break
        case 14:
          await sendEmail.trialFinalDay(emailProps)
          break
        default:
          break
      }

      console.log(`✅ Email sent to ${email} for trial day ${trialDay}`)
    }
  } catch (err) {
    console.error('❌ Error sending trial emails:', err)
  }
}
// Schedule the cron job to run daily at midnight
// cron.schedule('0 0 * * *', async () => {
//   try {
//     // Fetch Instagram data
//     const instagramFollowers = await getInstagramFollowers()
//     const instagramImpressions = await getInstagramInsights('impressions')
//     const instagramReach = await getInstagramInsights('reach')
//     const instagramMedia = await getInstagramMedia()

//     // // Fetch TikTok data
//     // const tikTokFollowers = await getTikTokFollowers();
//     // const tikTokVideos = await getTikTokVideos();

//     // // Fetch YouTube data
//     // const youtubeSubscribers = await getYoutubeSubscribers();
//     // const youtubeVideos = await getYoutubeVideos();

//     // Calculate averages
//     const avgInstagramLikes = calculateAverage(instagramMedia, 'likes_count')
//     const avgInstagramComments = calculateAverage(instagramMedia, 'comments_count')
//     // const avgYoutubeViews = calculateAverage(youtubeVideos, 'viewCount')
//     // const avgYoutubeWatchTime = calculateAverage(youtubeVideos, 'averageViewDuration')

//     // Create a new SocialMediaData document
//     const data = new SocialMediaData({
//       platform: 'Instagram',
//       followers: instagramFollowers,
//       impressions: instagramImpressions,
//       reach: instagramReach,
//       avgLikes: avgInstagramLikes,
//       avgComments: avgInstagramComments,
//       // avgViews: avgYoutubeViews,
//       // avgWatchTime: avgYoutubeWatchTime,
//       timestamp: new Date(),
//     })

//     // Save the data to the database
//     await data.save()

//     console.log('Social media data fetched and stored successfully.')
//   } catch (error) {
//     console.error('Error in cron job:', error)
//   }
// })

async function deleteUnverifiedUsers() {
  try {
    // const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
    const cutoffDate = new Date(Date.now() - 1 * 60 * 1000) // 1 minute ago

    const usersToDelete = await User.find({
      isEmailVerified: false,
      createdAt: { $lte: cutoffDate },
    })

    if (usersToDelete.length === 0) {
      console.log('🟡 No unverified users to delete.')
      return
    }

    await User.deleteMany({
      _id: { $in: usersToDelete.map((user) => user._id) },
    })

    console.log(`✅ Deleted ${usersToDelete.length} unverified user(s).`)
  } catch (error) {
    console.error('❌ Error deleting unverified users:', error)
  }
}

const syncTiktokCronJob = async () => {
  console.log('TikTok Cron started at', new Date().toISOString())

  const accounts = await TikTokAnalytics.find({})

  for (const account of accounts) {
    const { userId, accessToken, accessTokenExpiry, refreshToken } = account

    const now = new Date()
    if (!accessTokenExpiry || now >= accessTokenExpiry) {
      console.log(
        `Access token expired in TikTok for user ${userId}. Please refresh manually or implement auto-refresh.`
      )
      continue
    }

    try {
      await fetchAndSaveTikTokAnalytics({ userId, accessToken })
      console.log(`✅ TikTok analytics updated for user ${userId}`)
    } catch (error) {
      console.error(`❌ Failed to update analytics in TikTok for user ${userId}`, error.message)
    }
  }

  console.log('TikTok Cron finished at', new Date().toISOString())
}

const syncYouTubeCronJob = async () => {
  console.log(`[CRON] Running Youtube analytics update at ${new Date().toISOString()}`)

  const allUsers = await YoutubeAnalytics.find({ refreshToken: { $exists: true, $ne: null } })

  for (const user of allUsers) {
    try {
      await fetchYouTubeAnalytics({
        userId: user.userId,
        refreshToken: user.refreshToken,
      })
      console.log(`Synced YouTube analytics for user in Youtube ${user.userId}`)
    } catch (err) {
      console.error(`Error syncing YouTube analytics for user ${user.userId}:`, err.message)
    }
  }
}

const syncInstaCronJob = async () => {
  console.log(`[CRON] Running Instagram analytics update at ${new Date().toISOString()}`)

  const now = new Date()

  try {
    const validUsers = await InstaAnalytics.find({ longLivedTokenExpiry: { $gt: now } })

    for (const user of validUsers) {
      await updateInstagramAnalyticsForUser(user)
    }

    const expiredUsers = await InstaAnalytics.find({ longLivedTokenExpiry: { $lte: now } })
    expiredUsers.forEach((user) => {
      console.log(`[CRON] Token expired in Instagram for user ${user.userId}. They need to refresh their token.`)
    })
  } catch (err) {
    console.error('[CRON] General error in Instagram:', err.message)
  }
}
