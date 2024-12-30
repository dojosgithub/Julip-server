import { Router } from 'express'
import userRoutes from './user'
import authRoutes from './auth'
import followRoutes from './follow'
import postRoutes from './post'
import commentRoutes from './comment'
import groupRoutes from './group'
import challengeRoutes from './challenge'
import exerciseRoutes from './exercise'
import progressRoutes from './progress'
import profileRoutes from './profile'
import errorRoutes from './error'

const router = Router()

router.use('/auth', authRoutes)
router.use('/user', userRoutes)
router.use('/follow', followRoutes)
router.use('/post', postRoutes)
router.use('/comment', commentRoutes)
router.use('/group', groupRoutes)
router.use('/challenge', challengeRoutes)
router.use('/exercise', exerciseRoutes)
router.use('/progress', progressRoutes)
router.use('/profile', profileRoutes)
router.use('/error', errorRoutes)

export default router
