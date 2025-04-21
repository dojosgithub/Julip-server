// Using ES6 module import syntax
import { schedule } from 'node-cron'
import { AUCTION_STATUS, CAR_STATUS, SYSTEM_STAFF_ROLE, USER_TYPES } from './user'
import Email from '../utils/email'
import { Notification } from '../models/Notifications'
import { toObjectId } from './misc'
import { Comment, Group, Post, User, Badge, Product, Subscription } from '../models'
import { sendPushNotification } from './pushNotification'
import { calculateAverage, getInstagramFollowers, getInstagramInsights, getInstagramMedia } from './insta-acc-funcs'

// "0 0 * * 0", Every sunday at 00:00 - Required
// "59 14 * * 1", Every monday at 14:59
// "* * * * * *", Every second
// "* * * * *", Every minute
// 0 0 0 * * *, Every Midnight
// 0 0 * * *, every 24 hour

// Define the task using ES6 arrow function syntax
export const task = schedule(
  '0 0 0 * * *', // Every 24 hours
  // '* * * * *', // Every 24 hours
  () => {
    // if (process.env.NODE_ENV) automatedEmails()
    console.log('CRON JOB RUNNING!!!')
    productsToDelete()
    sendTrialEmails()
  },
  { timezone: 'America/New_York' }
)

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
        // case 14:
        //   await sendEmail.trialFinalDay(emailProps)
        //   break
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
