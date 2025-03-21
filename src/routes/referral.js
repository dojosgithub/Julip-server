// * Libraries
import express, { Router } from 'express'

// * Controllers
import { CONTROLLER_REFERRAL } from '../controllers'

// * Utilities
// import { validateRegistration } from '../models/User'
// import { USER_PERMISSIONS, USER_ROLE } from '../utils/user'

// * Middlewares
import { validateMiddleware, permitMiddleware, Authenticate } from '../middlewares'
import { parser } from '../utils/cloudinary'
import { totpRateLimiter } from '../utils/rateLimiter'
import { USER_TYPES } from '../utils'

const router = Router()

// Zeal App User Routes

router.post(
  '/generate-referral',
  Authenticate(),
  CONTROLLER_REFERRAL.generateRefferal
)

router.get(
  '/get-referral',
  Authenticate(),
  CONTROLLER_REFERRAL.getReferral
)

// router.put(
//   '/update-post',
//   Authenticate(),
//   permitMiddleware([USER_TYPES.SYS, USER_TYPES.USR]),
//   parser.array('files', 5),
//   CONTROLLER_POST.updatePost
// )

// router.get(
//   '/post-details',
//   Authenticate(),
//   permitMiddleware([USER_TYPES.SYS, USER_TYPES.USR]),
//   CONTROLLER_POST.postDetails
// )

// router.delete(
//   '/delete-post',
//   Authenticate(),
//   permitMiddleware([USER_TYPES.SYS, USER_TYPES.USR]),
//   CONTROLLER_POST.deletePost
// )

// router.get(
//   '/group-posts',
//   Authenticate(),
//   permitMiddleware([USER_TYPES.SYS, USER_TYPES.USR]),
//   CONTROLLER_POST.groupPostAll
// )

// router.get('/all-posts', Authenticate(), permitMiddleware([USER_TYPES.SYS, USER_TYPES.USR]), CONTROLLER_POST.allPosts)

// router.post('/like-post', Authenticate(), permitMiddleware([USER_TYPES.SYS, USER_TYPES.USR]), CONTROLLER_POST.likePost)

// router.post(
//   '/dislike-post',
//   Authenticate(),
//   permitMiddleware([USER_TYPES.SYS, USER_TYPES.USR]),
//   CONTROLLER_POST.dislikePost
// )

export default router
