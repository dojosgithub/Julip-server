// * Libraries
import express, { Router } from 'express'

// * Controllers
import { CONTROLLER_SHOP } from '../controllers'

// * Utilities
// import { validateRegistration } from '../models/User'
// import { USER_PERMISSIONS, USER_ROLE } from '../utils/user'

// * Middlewares
import { validateMiddleware, permitMiddleware, Authenticate } from '../middlewares'
import { parser, parserMultiple } from '../utils/cloudinary'
import { totpRateLimiter } from '../utils/rateLimiter'
import { USER_TYPES } from '../utils'
import { CONTROLLER_ABOUT } from '../controllers/about'

const router = Router()

router.get('/get-about', Authenticate(), CONTROLLER_ABOUT.getAbout)

router.post('/create-about', Authenticate(), parserMultiple.single('image'), CONTROLLER_ABOUT.addAboutItems)

router.put('/update-about', Authenticate(), parserMultiple.single('image'), CONTROLLER_ABOUT.updateAboutItems)

export default router
