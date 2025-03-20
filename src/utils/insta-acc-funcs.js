import axios from 'axios'

// Get Followers Count:
export const getInstagramFollowers = async (instaId, token) => {
  console.log('instaId, token', instaId, token)
  try {
    const response = await axios.get(
      `https://graph.instagram.com/${instaId}?fields=followers_count&access_token=${token}`
    )
    return response.data.followers_count
    console.log('cccccccccccccc', response.data)
  } catch (error) {
    console.error('Error fetching Instagram followers:', error)
    throw error
  }
}
// Get 30-day Total Impressions and Reach:
export const getInstagramInsights = async (instaId, metric, token) => {
  try {
    const response = await axios.get(
      `https://graph.instagram.com/${instaId}/insights?metric=${metric}&period=days_28&access_token=${token}`
    )
    return response.data.data[0].values[0].value
  } catch (error) {
    console.error(`Error fetching Instagram ${metric}:`, error)
    throw error
  }
}

//Get Avg Likes, Comments, Reels Views, Reels Watch Time:
export const getInstagramMedia = async (instaId, token) => {
  try {
    const response = await axios.get(
      `https://graph.instagram.com/${instaId}/media?fields=likes_count,comments_count,media_type,media_url,permalink&access_token=${token}`
    )
    return response.data.data
  } catch (error) {
    console.error('Error fetching Instagram media:', error)
    throw error
  }
}

export const getTikTokFollowers = async () => {
  try {
    const response = await axios.get('https://open.tiktokapis.com/v2/user/info/', {
      headers: {
        Authorization: `Bearer ${TIKTOK_ACCESS_TOKEN}`,
      },
    })
    return response.data.data.user_info.follower_count
  } catch (error) {
    console.error('Error fetching TikTok followers:', error)
    throw error
  }
}

export const getTikTokVideos = async () => {
  try {
    const response = await axios.get('https://open.tiktokapis.com/v2/video/list/', {
      headers: {
        Authorization: `Bearer ${TIKTOK_ACCESS_TOKEN}`,
      },
    })
    return response.data.data.videos
  } catch (error) {
    console.error('Error fetching TikTok videos:', error)
    throw error
  }
}

export const getYoutubeSubscribers = async () => {
  try {
    const response = await axios.get(
      `https://www.googleapis.com/youtube/v3/channels?part=statistics&forUsername=your-youtube-channel-username&key=${YOUTUBE_API_KEY}`
    )
    return response.data.items[0].statistics.subscriberCount
  } catch (error) {
    console.error('Error fetching YouTube subscribers:', error)
    throw error
  }
}

export const getYoutubeVideos = async () => {
  try {
    const response = await axios.get(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=your-playlist-id&key=${YOUTUBE_API_KEY}`
    )
    return response.data.items
  } catch (error) {
    console.error('Error fetching YouTube videos:', error)
    throw error
  }
}

export const calculateAverage = (data, field) => {
  const total = data.reduce((sum, item) => sum + item[field], 0)
  return total / data.length
}
