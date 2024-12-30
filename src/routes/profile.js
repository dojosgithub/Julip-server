// * Libraries
import express, { Router } from 'express'

// * Controllers
import { CONTROLLER_PROFILE } from '../controllers'

// * Middlewares
import { validateMiddleware, permitMiddleware, Authenticate } from '../middlewares'
import { parser } from '../utils/cloudinary'
import { totpRateLimiter } from '../utils/rateLimiter'
import { USER_TYPES } from '../utils'

const router = Router()

router.get('/profile', Authenticate(), CONTROLLER_PROFILE.profile)

router.put(
  '/profile-update',
  Authenticate(),
  // permitMiddleware([USER_TYPES.SYS, USER_TYPES.USR]),
  parser.single('avatar'),
  CONTROLLER_PROFILE.updateProfile
)

router.get('/get-user', Authenticate(), CONTROLLER_PROFILE.getUser)

export default router
