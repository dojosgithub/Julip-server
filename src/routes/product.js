// * Libraries
import express, { Router } from 'express'

// * Controllers
import { CONTROLLER_PRODUCT } from '../controllers'

// * Middlewares
import { validateMiddleware, permitMiddleware, Authenticate } from '../middlewares'
import { parser } from '../utils/cloudinary'
import { totpRateLimiter } from '../utils/rateLimiter'
import { USER_TYPES } from '../utils'

const router = Router()
router.get('/get-all-products', CONTROLLER_PRODUCT.getProducts)

router.get('/get-user-all-products', CONTROLLER_PRODUCT.getUserAllProducts)

router.post('/create-product', Authenticate(), parser.single('image'), CONTROLLER_PRODUCT.createProduct)

router.put(
  '/update-product',
  Authenticate(),
  // permitMiddleware([USER_TYPES.SYS, USER_TYPES.USR]),
  parser.single('image'),
  CONTROLLER_PRODUCT.updateProduct
)

router.delete('/delete-product', Authenticate(), CONTROLLER_PRODUCT.deleteProduct)

export default router
