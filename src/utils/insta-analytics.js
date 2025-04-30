import axios from 'axios'
import { InstaAnalytics } from '../models/InstaAnalytics.js' // adjust path as needed

export const updateInstagramAnalyticsForUser = async (user) => {
  const { instagramUserId, accessToken, userId } = user

  try {
    // 1. Fetch followers count
    const followersRes = await axios.get(
      `https://graph.instagram.com/${instagramUserId}?fields=followers_count&access_token=${accessToken}`
    )

    // 2. Fetch reach insights
    const reachRes = await axios.get(
      `https://graph.instagram.com/${instagramUserId}/insights?metric=reach&period=days_28&access_token=${accessToken}`
    )

    // 3. Fetch media insights
    const mediaRes = await axios.get(
      `https://graph.instagram.com/${instagramUserId}/media?fields=likes_count,comments_count,media_type,media_url,permalink,like_count,share_count&access_token=${accessToken}`
    )

    const mediaData = mediaRes.data.data || []

    const totalLikes = mediaData.reduce((sum, post) => sum + (post.like_count || 0), 0)
    const totalComments = mediaData.reduce((sum, post) => sum + (post.comments_count || 0), 0)
    const totalShares = mediaData.reduce((sum, post) => sum + (post.share_count || 0), 0)
    const totalPosts = mediaData.length

    const avgLikes = totalPosts ? totalLikes / totalPosts : 0
    const avgComments = totalPosts ? totalComments / totalPosts : 0
    const avgShares = totalPosts ? totalShares / totalPosts : 0

    const totalViews = reachRes.data.data.reduce((sum, insight) => sum + insight.values[0].value, 0)

    await InstaAnalytics.findOneAndUpdate(
      { userId },
      {
        followersCount: followersRes.data.followers_count,
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
        reachBreakdown: reachRes.data,
        lastSyncedAt: new Date(),
      }
    )

    console.log(`[UTIL] Updated Instagram analytics for user ${userId}`)
  } catch (error) {
    console.error(`[UTIL] Failed to update analytics for user ${userId}:`, error.response?.data || error.message)
  }
}
