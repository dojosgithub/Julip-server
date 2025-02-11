// * Libraries
import express, { Router } from 'express'

// * Controllers
import { CONTROLLER_FAQS, CONTROLLER_SERVICES, CONTROLLER_TESTIMONIALS } from '../controllers'

// * Middlewares
import { validateMiddleware, permitMiddleware, Authenticate } from '../middlewares'
import { parser } from '../utils/cloudinary'
import { totpRateLimiter } from '../utils/rateLimiter'
import { USER_TYPES } from '../utils'

const router = Router()

router.get('/get-user-all-service', Authenticate(), CONTROLLER_SERVICES.getListUserService)

router.post('/create-service', Authenticate(), CONTROLLER_SERVICES.createService)

router.post('/create-landingpage', Authenticate(), parser.single('image'), CONTROLLER_SERVICES.createLandingPage)

router.put('/update-service/:id', Authenticate(), CONTROLLER_SERVICES.updateService)

router.delete('/delete-service/:id', Authenticate(), CONTROLLER_SERVICES.deleteService)

router.post('/create-services', Authenticate(), CONTROLLER_SERVICES.createAndupdateServices)

router.put('/update-sigle-service-collection', Authenticate(), CONTROLLER_SERVICES.updateSingleServiceCollection)

router.post('/create-collection', Authenticate(), CONTROLLER_SERVICES.createCollection)

router.get('/get-services', Authenticate(), CONTROLLER_SERVICES.getServices)

export default router
