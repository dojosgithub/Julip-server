// * Libraries
import express, { Router } from 'express'

// * Controllers
import { CONTROLLER_ANALYTICS, getAnalyticsData } from '../controllers'

// * Utilities
// import { validateRegistration } from '../models/User'
// import { USER_PERMISSIONS, USER_ROLE } from '../utils/user'

// * Middlewares
import { validateMiddleware, permitMiddleware, Authenticate } from '../middlewares'
import { parser, parserMultiple } from '../utils/cloudinary'
import { totpRateLimiter } from '../utils/rateLimiter'
import { USER_TYPES } from '../utils'
import { CONTROLLER_ABOUT } from '../controllers/about'

const router = Router()

router.post('/all-clicks', CONTROLLER_ANALYTICS.addWebClick)

router.post('/product-click', CONTROLLER_ANALYTICS.addProductClick)

router.post('/web-view', CONTROLLER_ANALYTICS.addWebView)

router.post('/tab-view', CONTROLLER_ANALYTICS.addTabView)

router.post('/analysis-week', CONTROLLER_ANALYTICS.getAnalyticsLast7Days)

router.post('/analysis-two-week', CONTROLLER_ANALYTICS.getAnalyticsLast14Days)

// SSE Endpoint
router.get('/stream', async (req, res) => {
  const { userId, days } = req.query

  if (!userId) {
    return res.status(400).json({ message: 'Missing userId' })
  }

  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  })
  res.flushHeaders()

  const daysAgo = parseInt(days) || 7

  const sendData = async () => {
    const data = await getAnalyticsData(userId, daysAgo)
    if (data) {
      res.write(`data: ${JSON.stringify(data)}\n\n`)
    }
  }

  await sendData()

  const interval = setInterval(sendData, 10000) // every 10 seconds

  req.on('close', () => {
    clearInterval(interval)
  })
})

export default router
