// * Libraries
import express, { Router } from 'express'

// * Controllers
import { CONTROLLER_PAGES } from '../controllers'

const router = Router()

router.put('/update-pages', CONTROLLER_PAGES.updatePages)

router.get('/get-pages', CONTROLLER_PAGES.getPagesList)

export default router
