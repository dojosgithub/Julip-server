import axios from 'axios'
import { YoutubeAnalytics } from '../models'

export const fetchYouTubeAnalytics = async ({ userId, refreshToken }) => {
  if (!refreshToken) throw new Error('Missing refresh token')

  const params = new URLSearchParams()
  params.append('client_id', process.env.YOUTUBE_CLIENT_ID)
  params.append('client_secret', process.env.YOUTUBE_CLIENT_SECRET)
  params.append('grant_type', 'refresh_token')
  params.append('refresh_token', refreshToken)

  const tokenRes = await axios.post('https://oauth2.googleapis.com/token', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  const token = tokenRes.data.access_token

  const channelRes = await axios.get(`https://www.googleapis.com/youtube/v3/channels?part=id&mine=true`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const channelId = channelRes.data.items?.[0]?.id
  if (!channelId) throw new Error('No channel ID found')

  const today = new Date()
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - 30)

  const formatDate = (date) => date.toISOString().split('T')[0]
  const start = formatDate(startDate)
  const end = formatDate(today)

  const [analyticsRes, impressionsRes, statsRes, watchRes, demoRes, countryRes] = await Promise.all([
    axios.get(
      `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==${channelId}&startDate=${start}&endDate=${end}&metrics=views&dimensions=day&sort=day`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    ),
    axios.get(
      `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==${channelId}&startDate=${start}&endDate=${end}&metrics=views,estimatedMinutesWatched,likes,comments,shares&dimensions=day`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    ),
    axios.get(`https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
    axios.get(
      `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==${channelId}&startDate=${start}&endDate=${end}&metrics=estimatedMinutesWatched&dimensions=day`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    ),
    axios.get(
      `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==${channelId}&startDate=${start}&endDate=${end}&metrics=viewerPercentage&dimensions=ageGroup,gender`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    ),
    axios.get(
      `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==${channelId}&startDate=${start}&endDate=${end}&metrics=views&dimensions=country`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    ),
  ])

  let totalViews = 0,
    totalLikes = 0,
    totalComments = 0,
    totalShares = 0,
    estimatedWatchTime = 0
  const rows = impressionsRes.data?.rows || []

  rows.forEach(([_, views, watch, likes, comments, shares]) => {
    totalViews += views
    estimatedWatchTime += watch
    totalLikes += likes
    totalComments += comments
    totalShares += shares
  })

  const totalDays = rows.length || 1

  const update = {
    userId,
    channelId,
    lastSyncedAt: new Date(),
    totalReach: totalViews,
    totalLikes,
    totalComments,
    totalShares,
    totalEngagements: totalLikes + totalComments + totalShares,
    totalWatchTime: estimatedWatchTime,
    averageLikes: totalLikes / totalDays,
    averageComments: totalComments / totalDays,
    averageShares: totalShares / totalDays,
    averageWatchTime: estimatedWatchTime / totalDays,
    duration: `${totalDays}days`,
    demographics: demoRes.data,
    countryStats: countryRes.data,
    rawImpressions: impressionsRes.data,
    rawAnalytics: analyticsRes.data,
    subscriber: statsRes.data?.items?.[0]?.statistics?.subscriberCount,
  }

  await YoutubeAnalytics.findOneAndUpdate({ userId }, update, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
  })

  return update
}
