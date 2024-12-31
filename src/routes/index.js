import { Router } from 'express'
import userRoutes from './user'
import authRoutes from './auth'
import profileRoutes from './profile'
import errorRoutes from './error'

const router = Router()

router.use('/auth', authRoutes)
router.use('/user', userRoutes)
router.use('/profile', profileRoutes)
router.use('/error', errorRoutes)

export default router
