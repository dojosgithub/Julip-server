import { Router } from 'express'
import userRoutes from './user'
import authRoutes from './auth'
import profileRoutes from './profile'
import templateRoutes from './template'
import shopRoutes from './shop'
import productRoutes from './product'
import aboutRoutes from './about'
import errorRoutes from './error'

const router = Router()

router.use('/auth', authRoutes)
router.use('/user', userRoutes)
router.use('/profile', profileRoutes)
router.use('/template', templateRoutes)
router.use('/shop', shopRoutes)
router.use('/product', productRoutes)
router.use('/about', aboutRoutes)
router.use('/error', errorRoutes)

export default router
