// * Libraries
import express, { Router } from 'express'

// * Controllers
import { CONTROLLER_PORTFOLIO, CONTROLLER_SAMPLE } from '../controllers'
import { Authenticate } from '../middlewares'

const router = Router()

router.get('/get-portfolio', Authenticate(), CONTROLLER_PORTFOLIO.getPortfolio)

router.put('/update-portfolio', Authenticate(), CONTROLLER_PORTFOLIO.updatePortfolio)

router.get('/fb-access-token', Authenticate(), CONTROLLER_PORTFOLIO.fbSocialAccessToken)

router.post('/insta-details', Authenticate(), CONTROLLER_PORTFOLIO.InstaDetails)

router.post('/fb-details', Authenticate(), CONTROLLER_PORTFOLIO.fbDetails)

router.get('/linkedin-access-token', Authenticate(), CONTROLLER_PORTFOLIO.linkedInAccessToken)

router.post('/linkedin-details', Authenticate(), CONTROLLER_PORTFOLIO.getLinkedInPageFollowers)

router.post('/linkedin-details2', Authenticate(), CONTROLLER_PORTFOLIO.getLinkedInData)

router.post('/youtube-channel-id', Authenticate(), CONTROLLER_PORTFOLIO.youtubeApiKey)

router.post('/youtube-subscriber', Authenticate(), CONTROLLER_PORTFOLIO.youtubeSubscriber)

router.post('/get-tiktok-analytics', CONTROLLER_PORTFOLIO.getTiktokAnalytics)
router.post('/get-insta-analytics', CONTROLLER_PORTFOLIO.getInstaAnalytics)
router.post('/get-youtube-analytics', CONTROLLER_PORTFOLIO.getYoutubeAnalytics)

router.get('/tiktok-demo', Authenticate(), CONTROLLER_PORTFOLIO.fetchDemographics)

router.get('/insta-demo', Authenticate(), CONTROLLER_PORTFOLIO.fetchInstaDemographics)

router.get('/auth1', Authenticate(), CONTROLLER_PORTFOLIO.fbSocialAccessToken2)

router.post('/insta2', Authenticate(), CONTROLLER_PORTFOLIO.fbSocialAccessToken2)
// working apis only
router.post('/tiktok-details', Authenticate(), CONTROLLER_PORTFOLIO.fetchTikTokData)
router.get('/fb-insta-analytics', Authenticate(), CONTROLLER_PORTFOLIO.fbInstaAnalyticsHandler)
router.get('/youtube-access-token', Authenticate(), CONTROLLER_PORTFOLIO.youtubeAccessToken)
router.post('/youtube-analytics', Authenticate(), CONTROLLER_PORTFOLIO.youtubeAnalytics)
router.get('/get-youtube-analytics', Authenticate(), CONTROLLER_PORTFOLIO.getYoutubeAnalytics)
export default router
