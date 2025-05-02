import express from 'express'
import path from 'path'
import cookieParser from 'cookie-parser'
import logger from 'morgan'
import cors from 'cors'
import routes from './routes'
import { errorHandler, decodeRoleTokenMiddleware, Authenticate } from './middlewares'
import { connectMongoDB } from './config/dbConnection'
import { corsConfig } from './config/cors'
import passport from 'passport'
import session from 'express-session'
// import passport.js
import './utils/passport.js'
// import sse from './config/sse'
import { CONTROLLER_PAYMENT, CONTROLLER_PRICING } from './controllers'
import fs from 'fs'
// import secretsManager from './config/secretsManager'
import dotenv from 'dotenv'
import configSwagger from './config/swagger'

import { createServer } from 'node:http'

import { init } from './socket'
import { setupSocketEventHandlers } from './socketEvents'
import { instaschedule, task, tiktokschedule, youtubeschedule } from './utils/cron'
import bodyParser from 'body-parser'

// import { challengeTask } from './utils/challenge-cron'

// For Socket.io
global.serverRoot = path.resolve(__dirname)

const app = express()

// For Socket.io
const server = createServer(app)
init(server)
// Setup Socket.IO event handlers
setupSocketEventHandlers()

const PORT = process.env.PORT || 3000
const PUBLIC_PATH = path.join(__dirname, 'public')
connectMongoDB()

app.use(express.static(PUBLIC_PATH))
app.use(logger('dev'))
app.use(cookieParser())
app.use(cors(corsConfig))
app.post(
  '/api/payment/stripe/webhook',
  express.raw({ type: 'application/json' }),
  CONTROLLER_PAYMENT.stripeWebhookSecure
)
app.post(
  '/api/stripe/oauth/callback',
  express.raw({ type: 'application/json' }),
  Authenticate(),
  CONTROLLER_PRICING.stripeCallback
)
// app.post(
//   '/webhooks/stripe/connect',
//   express.raw({ type: 'application/json' }),
//   Authenticate(),
//   CONTROLLER_PRICING.handleInfluencerWebhook
// )
app.post('api/stripe-webhook-payment-successful', async (req, res) => {
  const sig = req.headers['stripe-signature']
  const payload = req.body

  try {
    const event = stripe.webhooks.constructEvent(payload, sig, process.env.STRIPE_WEBHOOK_SECRET)

    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object
        console.log('Payment succeeded:', paymentIntent.id)

        // Update your database or trigger other actions
        break

      case 'payment_intent.payment_failed':
        const failedPaymentIntent = event.data.object
        console.log('Payment failed:', failedPaymentIntent.id)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    res.status(200).send('Webhook received')
  } catch (err) {
    console.error('Webhook error:', err)
    res.status(400).send(`Webhook error: ${err.message}`)
  }
})
app.use(express.json({ limit: '50mb', extended: true }))
app.use(decodeRoleTokenMiddleware)
app.use(
  session({
    secret: process.env.SESSION_SECRET, // session secret
    resave: false,
    saveUninitialized: false,
  })
)
// initialize passport and session
app.use(passport.initialize())
app.use(passport.session())
app.use(bodyParser.json())
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups')
  next()
})
// app.get(
//   '/api/stream',
//   (req, res, next) => {
//     res.flush = () => {}
//     next()
//   },
//   sse.init
// )
// app.get(
//   '/auth/google',
//   passport.authenticate('google', {
//     scope: ['email', 'profile'],
//   })
// )

app.post('api/auth/google/callback', async (req, res) => {
  const { code } = req.body

  try {
    // Exchange authorization code for tokens
    const { data } = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      code,
      redirect_uri: process.env.REDIRECT_URI,
      grant_type: 'authorization_code',
    })

    const { access_token, id_token } = data

    // Fetch user profile using the access token
    const { data: profile } = await axios.get('https://www.googleapis.com/oauth2/v1/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    })

    console.log('User Profile:', profile)

    // Handle user authentication and redirection
    res.redirect('/dashboard') // Redirect to your app's dashboard
  } catch (error) {
    console.error('Error during Google OAuth:', error.response ? error.response.data : error.message)
    res.status(500).send('An error occurred during Google login.')
  }
})
// app.get(
//   '/auth/google/callback',
//   passport.authenticate('google', {
//     access_type: 'offline',
//     scope: ['email', 'profile'],
//   }),
//   (req, res) => {
//     if (!req.user) {
//       res.status(400).json({ error: 'Authentication failed' })
//     }
//     // return user details
//     res.status(200).json(req.user)
//   }
// )

// Abhiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii  KKKKKK Liyay temporary
// Route to initiate Instagram OAuth
const redirectUri = 'https://dev.myjulip.com/auth/jwt/onboarding/'
const clientId = '1089027439925876'
const clientSecret = 'a224feadf5c45dba7ef34501e0b7c0a1'
app.get('api/fb-callback', (req, res) => {
  const authUrl =
    `https://api.instagram.com/oauth/authorize` +
    `?client_id=${clientId}` +
    `&redirect_uri=${redirectUri}` +
    `&scope=user_profile,user_media` +
    `&response_type=code`

  res.redirect(authUrl)
})
// Callback route to handle Instagram OAuth
app.get('api/callback', async (req, res) => {
  const { code } = req.query
  try {
    const tokenResponse = await axios.post(`https://api.instagram.com/oauth/access_token`, {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code,
    })
    const { access_token, user_id } = tokenResponse.data
    res.json({ access_token, user_id })
  } catch (error) {
    res.status(500).send('Error fetching access token')
  }
})
app.use('/api-docs', configSwagger)
app.use('/api', routes)
app.use(errorHandler)

app.get('/ping', (req, res) => res.send('Ping Successfulls 😄'))

server.listen(PORT, async () => {
  // app.listen(PORT, '0.0.0.0', '0', async () => {
  task.start()
  // instaschedule.start()
  // tiktokschedule.start()
  // youtubeschedule.start()
  // challengeTask.start()
  console.log(`[⚡️ server]: Server running on port ${PORT} | Environment: ${process.env.NODE_ENV}`)
})

export default server
