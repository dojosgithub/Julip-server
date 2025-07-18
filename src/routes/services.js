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

router.post('/create-service', Authenticate(), parser.single('image'), CONTROLLER_SERVICES.createService)

router.post('/create-landingpage', Authenticate(), parser.single('image'), CONTROLLER_SERVICES.createLandingPage)

router.put('/update-landingpage/:id', Authenticate(), parser.single('image'), CONTROLLER_SERVICES.updateLandingPage)

router.put('/update-service/:id', parser.single('image'), Authenticate(), CONTROLLER_SERVICES.updateService)

router.delete('/delete-service/:id', Authenticate(), CONTROLLER_SERVICES.deleteService)

router.delete('/delete-landingpage/:id', Authenticate(), CONTROLLER_SERVICES.deleteLandingPage)

router.post('/create-services', Authenticate(), CONTROLLER_SERVICES.createAndupdateServices)

router.put('/update-single-service-collection', Authenticate(), CONTROLLER_SERVICES.updateSingleServiceCollection)

router.put('/update-collection', Authenticate(), CONTROLLER_SERVICES.updateCollection)

router.post('/create-collection', Authenticate(), CONTROLLER_SERVICES.createCollection)

router.delete('/delete-collection', Authenticate(), CONTROLLER_SERVICES.deleteCollection)

router.get('/get-all-collections', Authenticate(), CONTROLLER_SERVICES.getAllCollections)

router.get('/get-services', Authenticate(), CONTROLLER_SERVICES.getServices)

export default router
