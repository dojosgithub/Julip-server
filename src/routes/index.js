import { Router } from 'express'
import userRoutes from './user'
import authRoutes from './auth'
import profileRoutes from './profile'
import templateRoutes from './template'
import shopRoutes from './shop'
import productRoutes from './product'
import aboutRoutes from './about'
import errorRoutes from './error'
import pricingRoutes from './pricing'
import scrappingRoute from './scrapper'
import analyticsRoute from './analytics'
import liveRoute from './live'
import faqRoute from './faq'
import servicesRoute from './services'
import testimonialRoute from './testimonial'

const router = Router()

router.use('/auth', authRoutes)
router.use('/user', userRoutes)
router.use('/profile', profileRoutes)
router.use('/template', templateRoutes)
router.use('/shop', shopRoutes)
router.use('/product', productRoutes)
router.use('/about', aboutRoutes)
router.use('/error', errorRoutes)
router.use('/pricing', pricingRoutes)
router.use('/scrape', scrappingRoute)
router.use('/analytics', analyticsRoute)
router.use('/live', liveRoute)
router.use('/faq', faqRoute)
router.use('/service', servicesRoute)
router.use('/testimonial', testimonialRoute)

export default router
