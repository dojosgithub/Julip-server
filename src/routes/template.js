// * Libraries
import express, { Router } from 'express'

// * Controllers
import { CONTROLLER_TEMPLATE } from '../controllers'

// * Utilities
// import { validateRegistration } from '../models/User'
// import { USER_PERMISSIONS, USER_ROLE } from '../utils/user'

// * Middlewares
import { validateMiddleware, permitMiddleware, Authenticate } from '../middlewares'
import { parser } from '../utils/cloudinary'
import { totpRateLimiter } from '../utils/rateLimiter'
import { USER_TYPES } from '../utils'

const router = Router()

router.post('/create-template', Authenticate(), CONTROLLER_TEMPLATE.createTemplate)

router.put('/update-template', Authenticate(), CONTROLLER_TEMPLATE.updateTemplate)

export default router
