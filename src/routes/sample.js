// * Libraries
import express, { Router } from 'express'

// * Controllers
import { CONTROLLER_BRAND, CONTROLLER_FAQS, CONTROLLER_SAMPLE } from '../controllers'

// * Middlewares
import { validateMiddleware, permitMiddleware, Authenticate } from '../middlewares'
import { parser } from '../utils/cloudinary'
import { totpRateLimiter } from '../utils/rateLimiter'
import { USER_TYPES } from '../utils'

const router = Router()

// router.get('/get-user-all-sample', Authenticate(), CONTROLLER_SAMPLE.getSamples)

router.get('/get-sample/:id', Authenticate(), CONTROLLER_SAMPLE.getSampleById)

// router.post('/create-sample', Authenticate(), CONTROLLER_SAMPLE.createSample)

// router.put('/update-sample/:id', Authenticate(), CONTROLLER_SAMPLE.updateSample)

// router.delete('/delete-sample/:id', Authenticate(), CONTROLLER_SAMPLE.deleteSample)

router.delete('/delete-sample/:id', Authenticate(), CONTROLLER_SAMPLE.deleteSample)

router.post('/create-sample-item', Authenticate(), CONTROLLER_SAMPLE.createSampleItem)

router.put('/update-sample-item/:id', Authenticate(), CONTROLLER_SAMPLE.updateSampleItem)

router.put('/update-sample', Authenticate(), CONTROLLER_SAMPLE.updatePortfolioSample)

router.get('/get-sample', Authenticate(), CONTROLLER_SAMPLE.getPortfolioSample)

router.post('/delete-sample-item/:id', Authenticate(), CONTROLLER_SAMPLE.deleteSampleListItem)

export default router
