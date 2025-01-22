// * Libraries
import express, { Router } from 'express'

// * Controllers
import { CONTROLLER_FAQS } from '../controllers'

// * Middlewares
import { validateMiddleware, permitMiddleware, Authenticate } from '../middlewares'
import { parser } from '../utils/cloudinary'
import { totpRateLimiter } from '../utils/rateLimiter'
import { USER_TYPES } from '../utils'

const router = Router()

router.get('/get-user-all-faqs', Authenticate(), CONTROLLER_FAQS.getUserFaqs)

router.post('/create-faq', Authenticate(), CONTROLLER_FAQS.createFaq)

router.put('/update-faq/:id', Authenticate(), CONTROLLER_FAQS.updateFaq)

router.delete('/delete-faq/:id', Authenticate(), CONTROLLER_FAQS.deleteFaq)

export default router
