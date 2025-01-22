// * Libraries
import express, { Router } from 'express'

// * Controllers
import { CONTROLLER_FAQS, CONTROLLER_TESTIMONIALS } from '../controllers'

// * Middlewares
import { validateMiddleware, permitMiddleware, Authenticate } from '../middlewares'
import { parser } from '../utils/cloudinary'
import { totpRateLimiter } from '../utils/rateLimiter'
import { USER_TYPES } from '../utils'

const router = Router()

router.get('/get-user-all-testimonials', Authenticate(), CONTROLLER_TESTIMONIALS.getUserTestimonials)

router.post('/create-testimonial', Authenticate(), parser.single('image'), CONTROLLER_TESTIMONIALS.createTestimonial)

router.put('/update-testimonial/:id', Authenticate(), parser.single('image'), CONTROLLER_TESTIMONIALS.updateTestimonial)

router.delete('/delete-testimonial/:id', Authenticate(), CONTROLLER_TESTIMONIALS.deleteTestimonial)

export default router
