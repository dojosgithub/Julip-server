// * Libraries
import express, { Router } from 'express'

// * Controllers
import { CONTROLLER_BRAND, CONTROLLER_FAQS } from '../controllers'

// * Middlewares
import { validateMiddleware, permitMiddleware, Authenticate } from '../middlewares'
import { parser } from '../utils/cloudinary'
import { totpRateLimiter } from '../utils/rateLimiter'
import { USER_TYPES } from '../utils'

const router = Router()

// router.get('/get-user-all-brand', Authenticate(), CONTROLLER_BRAND.getBrands)

// router.get('/get-brand/:id', Authenticate(), CONTROLLER_BRAND.getBrandById)

router.get('/get-brand-collection', Authenticate(), CONTROLLER_BRAND.getBrandCollection)
router.put(
  '/update-brand-collection/:id',
  Authenticate(),
  parser.single('image'),
  CONTROLLER_BRAND.updateBrandCollection
)

router.get('/get-brand/:id', Authenticate(), CONTROLLER_BRAND.getBrandById)

router.post('/create-brand', Authenticate(), parser.single('image'), CONTROLLER_BRAND.createBrand)

router.put('/update-brand/:id', Authenticate(), parser.single('image'), CONTROLLER_BRAND.updateBrand)

router.delete('/delete-brand/:id', Authenticate(), CONTROLLER_BRAND.deleteBrand)

export default router
