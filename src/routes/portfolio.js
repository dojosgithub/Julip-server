// * Libraries
import express, { Router } from 'express'

// * Controllers
import { CONTROLLER_PORTFOLIO, CONTROLLER_SAMPLE } from '../controllers'
import { Authenticate } from '../middlewares'

const router = Router()

router.get('/get-portfolio', Authenticate(), CONTROLLER_PORTFOLIO.getPortfolio)

router.put('/update-portfolio', Authenticate(), CONTROLLER_PORTFOLIO.updatePortfolio)

router.get('/fb-access-token', Authenticate(), CONTROLLER_PORTFOLIO.fbSocialAccessToken)

router.post('/fb-details', Authenticate(), CONTROLLER_PORTFOLIO.fbDetails)

router.get('/linkedin-access-token', Authenticate(), CONTROLLER_PORTFOLIO.linkedInAccessToken)

router.post('/linkedin-details', Authenticate(), CONTROLLER_PORTFOLIO.getLinkedInPageFollowers)

router.post('/linkedin-details2', Authenticate(), CONTROLLER_PORTFOLIO.getLinkedInData)

router.get('/youtube-access-token', Authenticate(), CONTROLLER_PORTFOLIO.youtubeAccessToken)

router.post('/youtube-channel-id', Authenticate(), CONTROLLER_PORTFOLIO.youtubeApiKey)

router.post('/youtube-analytics', Authenticate(), CONTROLLER_PORTFOLIO.youtubeAnalytics)

export default router
