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
router.get('/get-all-products', Authenticate(), CONTROLLER_PRODUCT.getProducts)

router.get('/get-user-all-products', Authenticate(), CONTROLLER_PRODUCT.getUserAllProducts)

router.get('/search-products', Authenticate(), CONTROLLER_PRODUCT.getFilteredProducts)

router.get('/search-products-by-collection', Authenticate(), CONTROLLER_PRODUCT.getProductsByCollection)

router.post('/create-product', Authenticate(), parser.single('image'), CONTROLLER_PRODUCT.createProduct)

router.put(
  '/update-product',
  Authenticate(),
  // permitMiddleware([USER_TYPES.SYS, USER_TYPES.USR]),
  parser.single('image'),
  CONTROLLER_PRODUCT.updateProduct
)

router.delete('/delete-product', Authenticate(), CONTROLLER_PRODUCT.deleteProduct)

router.put('/cancel-subscription-product', Authenticate(), CONTROLLER_PRODUCT.cancelSubscriptionProduct)

router.get('/resubscribe-subscription-product', Authenticate(), CONTROLLER_PRODUCT.resubscribeProduct)

export default router
