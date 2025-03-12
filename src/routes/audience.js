// * Libraries
import express, { Router } from 'express'

// * Controllers
import { CONTROLLER_AUDIENCE, CONTROLLER_FAQS } from '../controllers'

// * Middlewares
import { validateMiddleware, permitMiddleware, Authenticate } from '../middlewares'
import { parser } from '../utils/cloudinary'
import { totpRateLimiter } from '../utils/rateLimiter'
import { USER_TYPES } from '../utils'

const router = Router()

router.get('/get-audience', Authenticate(), CONTROLLER_AUDIENCE.getAudiences)

router.post('/create-and-update-audience', Authenticate(), CONTROLLER_AUDIENCE.createAndupdateAudience)

// router.put('/update-faq/:id', Authenticate(), CONTROLLER_AUDIENCE.updateFaq)

// router.delete('/delete-audience/:id', Authenticate(), CONTROLLER_AUDIENCE.deleteAudience)

export default router
