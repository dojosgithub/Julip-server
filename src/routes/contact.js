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

// router.get('/get-user-all-brand', Authenticate(), CONTROLLER_CONTACT.getContactById)

// router.get('/get-contact', Authenticate(), CONTROLLER_CONTACT.getContact)

// router.post('/create-and-update-contact', Authenticate(), CONTROLLER_CONTACT.createAndupdateContact)

// router.put('/update-brand/:id', Authenticate(), parser.single('image'), CONTROLLER_CONTACT.updateContact)

// router.delete('/delete-contact-item', Authenticate(), CONTROLLER_CONTACT.deleteContactItem)

// ///////////////////////////////////////////////////////////////////////////////////////

router.post('/create-contact-item', Authenticate(), CONTROLLER_CONTACT.createContact)

router.put('/update-contact', Authenticate(), CONTROLLER_CONTACT.updateContact)

router.get('/get-contact', Authenticate(), CONTROLLER_CONTACT.getContact)

router.get('/get-contact-item/:id', Authenticate(), CONTROLLER_CONTACT.getContactById)

router.delete('/delete-contact-item/:id', Authenticate(), CONTROLLER_CONTACT.deleteContactById)

router.put('/update-contact-item/:id', Authenticate(), CONTROLLER_CONTACT.updateContactById)

export default router
