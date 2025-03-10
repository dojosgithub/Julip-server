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

router.get('/get-user-all-sample', Authenticate(), CONTROLLER_SAMPLE.getSamples)

router.get('/get-sample/:id', Authenticate(), CONTROLLER_SAMPLE.getSampleById)

router.post('/create-sample', Authenticate(), CONTROLLER_SAMPLE.createSample)

router.put('/update-sample/:id', Authenticate(), CONTROLLER_SAMPLE.updateSample)

router.delete('/delete-sample/:id', Authenticate(), CONTROLLER_SAMPLE.deleteSample)

export default router
