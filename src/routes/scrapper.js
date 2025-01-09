// * Libraries
import express, { Router } from 'express'

// * Controllers
import { CONTROLLER_PROFILE, CONTROLLER_SCRAPPER } from '../controllers'

// * Middlewares
import { validateMiddleware, permitMiddleware, Authenticate } from '../middlewares'
import { parser } from '../utils/cloudinary'
import { totpRateLimiter } from '../utils/rateLimiter'
import { USER_TYPES } from '../utils'
import { CONTROLLER_SCRAPE } from '../controllers/scrapperRoutes'

const router = Router()

router.post('/amazon', Authenticate(), CONTROLLER_SCRAPE.scrapeAmazon)

router.post('/walmart', Authenticate(), CONTROLLER_SCRAPE.scrapeWalmart)

router.post('/shopify', Authenticate(), CONTROLLER_SCRAPE.scrapeShopify)

export default router
