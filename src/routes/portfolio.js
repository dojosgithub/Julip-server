// * Libraries
import express, { Router } from 'express'

// * Controllers
import { CONTROLLER_PORTFOLIO, CONTROLLER_SAMPLE } from '../controllers'
import { Authenticate } from '../middlewares'

const router = Router()

router.get('/get-portfolio', Authenticate(), CONTROLLER_PORTFOLIO.getPortfolio)

router.put('/update-portfolio', Authenticate(), CONTROLLER_PORTFOLIO.getPortfolio)

export default router
