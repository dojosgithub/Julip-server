import axios from 'axios'
import { TikTokAnalytics } from '../models'

export const fetchAndSaveTikTokAnalytics = async ({ code, userId, accessToken }) => {
  try {
    if (!accessToken && !code) {
      throw new Error('Either accessToken or code must be provided')
    }

    // Step 1: Exchange code for token if code is provided
    if (code) {
      const tokenResponse = await axios.post(
        'https://open.tiktokapis.com/v2/oauth/token/',
        new URLSearchParams({
          client_key: process.env.TIKTOK_CLIENT_KEY,
          client_secret: process.env.TIKTOK_CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
          redirect_uri: process.env.TIKTOK_REDIRECT_URI,
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      )

      accessToken = tokenResponse.data.access_token
      const refreshToken = tokenResponse.data.refresh_token
      const accessTokenExpiry = new Date(Date.now() + tokenResponse.data.expires_in * 1000)
      const refreshTokenExpiry = tokenResponse.data.refresh_token_expires_in
        ? new Date(Date.now() + tokenResponse.data.refresh_token_expires_in * 1000)
        : null

      await TikTokAnalytics.findOneAndUpdate(
        { userId },
        {
          accessToken,
          accessTokenExpiry,
          refreshToken,
          refreshTokenExpiry,
          openId: tokenResponse.data.open_id,
        },
        { upsert: true, new: true }
      )
    }

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

    // Step 3: Fetch user's videos
    const videoListResponse = await axios.post(
      'https://open.tiktokapis.com/v2/video/list/?fields=cover_image_url,id,title',
      { max_count: 20 },
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
      console.log(`No videos found for user ${userId}`)
      return
    }

    // Step 4: Fetch insights
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
    const avgLikes = totalLikes / count || 0
    const avgComments = totalComments / count || 0
    const avgViews = totalViews / count || 0
    const avgShares = totalShares / count || 0

    // Step 6: Save everything
    await TikTokAnalytics.findOneAndUpdate(
      { userId },
      {
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
  } catch (error) {
    console.error(`Error in fetchAndSaveTikTokAnalytics for user ${userId}:`, error.response?.data || error.message)
    throw error
  }
}
