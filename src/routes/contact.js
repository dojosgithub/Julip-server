// * Libraries
import express, { Router } from 'express'

// * Controllers
import { CONTROLLER_BRAND, CONTROLLER_CONTACT, CONTROLLER_FAQS } from '../controllers'

// * Middlewares
import { validateMiddleware, permitMiddleware, Authenticate } from '../middlewares'
import { parser } from '../utils/cloudinary'
import { totpRateLimiter } from '../utils/rateLimiter'
import { USER_TYPES } from '../utils'

const router = Router()

router.get('/get-user-all-brand', Authenticate(), CONTROLLER_CONTACT.getContactById)

router.get('/get-brand/:id', Authenticate(), CONTROLLER_CONTACT.getContactById)

router.post('/create-brand', Authenticate(), parser.single('image'), CONTROLLER_CONTACT.createContact)

router.put('/update-brand/:id', Authenticate(), parser.single('image'), CONTROLLER_CONTACT.updateContact)

router.delete('/delete-brand/:id', Authenticate(), CONTROLLER_CONTACT.deleteContact)

export default router
