// * Libraries
import express, { Router } from 'express'

// * Controllers
import { CONTROLLER_PAGES } from '../controllers'
import { Authenticate } from '../middlewares'

const router = Router()

router.put('/update-pages', Authenticate(), CONTROLLER_PAGES.updatePages)

router.get('/get-pages', Authenticate(), CONTROLLER_PAGES.getPagesList)

export default router
