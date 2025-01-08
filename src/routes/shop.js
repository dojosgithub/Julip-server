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

router.get('/get-collection', Authenticate(), CONTROLLER_SHOP.getCollections)

router.post('/create-shop', Authenticate(), CONTROLLER_SHOP.createShop)

router.put('/update-shop', Authenticate(), CONTROLLER_SHOP.updateShop)

router.delete('/delete-shop', Authenticate(), CONTROLLER_SHOP.deleteShop)

export default router
