// Using ES6 module import syntax
import { schedule } from 'node-cron'
import { AUCTION_STATUS, CAR_STATUS, SYSTEM_STAFF_ROLE, USER_TYPES } from './user'
import Email from '../utils/email'
import { Notification } from '../models/Notifications'
import { toObjectId } from './misc'
import { Comment, Group, Post, User, Badge, Product } from '../models'
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
