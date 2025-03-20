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

export default router
