// * Libraries
import express, { Router } from 'express'

// * Controllers
import { CONTROLLER_AUTH } from '../controllers'

// * Utilities
// import { validateRegistration } from '../models/User'
// import { USER_PERMISSIONS, USER_ROLE } from '../utils/user'

// * Middlewares
import { validateMiddleware, permitMiddleware, Authenticate } from '../middlewares'
import { parser } from '../utils/cloudinary'
import { USER_TYPES } from '../utils'

const router = Router()

// Zeal App User Routes

// router.post('/get-code', CONTROLLER_AUTH.getCode)

router.post('/verify-account', CONTROLLER_AUTH.verifyAccount)

router.post('/sign-up', CONTROLLER_AUTH.signUp)

router.get('/sign-out', Authenticate(), CONTROLLER_AUTH.signOut)

router.post('/sign-in', CONTROLLER_AUTH.signIn)

router.post('/forgot-password', CONTROLLER_AUTH.forgotPassword)

router.post('/forgot-password-link', CONTROLLER_AUTH.forgotPasswordLink)

router.post('/reset-password', CONTROLLER_AUTH.resetPassword)

router.post('/reset-password-authrnticated', Authenticate(), CONTROLLER_AUTH.resetPasswordAuthenticatedUser)

router.post('/verify', Authenticate(), CONTROLLER_AUTH.verifyUpdatePasswordCode)

router.post('/verify-email', Authenticate(), CONTROLLER_AUTH.verifyEmail)

router.post('/get-code', Authenticate(), CONTROLLER_AUTH.resendEmailVerificationCode)

router.post('/create-slug', Authenticate(), CONTROLLER_AUTH.createSlug)

router.post(
  '/sendNotification',
  Authenticate(),
  permitMiddleware([USER_TYPES.SYS, USER_TYPES.USR]),
  CONTROLLER_AUTH.sendNotification
)

router.put(
  '/change-password',
  Authenticate(),
  permitMiddleware([USER_TYPES.SYS, USER_TYPES.USR]),
  CONTROLLER_AUTH.changePassword
)

router.post('/google/callback', CONTROLLER_AUTH.OAuth2)

router.post('/sendemail', CONTROLLER_AUTH.checkemail)

router.post('/apple/callback', CONTROLLER_AUTH.handleAppleCallback)

export default router
