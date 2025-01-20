// * Libraries
import express, { Router } from 'express'

// * Controllers
import { CONTROLLER_TEMPLATE } from '../controllers'

const router = Router()
router.post('/get-detailed-template', CONTROLLER_TEMPLATE.getUsernameTemplate)

export default router
