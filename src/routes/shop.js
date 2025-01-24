// * Libraries
import express, { Router } from 'express'

// * Controllers
import { CONTROLLER_SHOP } from '../controllers'

// * Utilities
// import { validateRegistration } from '../models/User'
// import { USER_PERMISSIONS, USER_ROLE } from '../utils/user'

// * Middlewares
import { validateMiddleware, permitMiddleware, Authenticate } from '../middlewares'
import { parser } from '../utils/cloudinary'
import { totpRateLimiter } from '../utils/rateLimiter'
import { USER_TYPES } from '../utils'

const router = Router()

router.get('/get-shops', Authenticate(), CONTROLLER_SHOP.getAllShops)

router.get('/get-shop', Authenticate(), CONTROLLER_SHOP.getShop)

router.post('/create-shop', Authenticate(), CONTROLLER_SHOP.createShop)

router.get('/get-collection', Authenticate(), CONTROLLER_SHOP.getCollections)

router.post('/create-collection', Authenticate(), CONTROLLER_SHOP.createCollection)

router.put('/update-collection', Authenticate(), CONTROLLER_SHOP.updateCollection)

router.put('/update-single-product-collection', Authenticate(), CONTROLLER_SHOP.updateSingleProductCollection)

router.delete('/delete-collection/:collectionName', Authenticate(), CONTROLLER_SHOP.deleteCollection)

router.put('/update-shop', Authenticate(), CONTROLLER_SHOP.updateShop)

router.delete('/delete-shop', Authenticate(), CONTROLLER_SHOP.deleteShop)

router.get('/get-pinned-products', Authenticate(), CONTROLLER_SHOP.getPinnedList)

export default router
