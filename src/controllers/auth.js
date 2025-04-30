// * Libraries
import { StatusCodes } from 'http-status-codes'
import { isEmpty, isUndefined, concat, cloneDeep } from 'lodash'
import speakeasy, { totp } from 'speakeasy'
import mongoose, { model } from 'mongoose'
const axios = require('axios')
import passport from 'passport'
import dotenv from 'dotenv'
import { v4 as uuidv4 } from 'uuid'
import appleSignin from 'apple-signin-auth'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

dotenv.config()

// * Models
import { User, TOTP, Group, Post, Comment, Badge, Challenge, UserChallengeProgress } from '../models'

// * Middlewares
import { asyncMiddleware } from '../middlewares'

// * Utilities
import {
  DEALERSHIP_STATUS,
  DEALERSHIP_STAFF_ROLE,
  DOC_STATUS,
  getRoleByValue,
  getRoleShortName,
  USER_ROLE,
  USER_TYPES,
  AUCTION_STATUS,
  CAR_STATUS,
  SYSTEM_STAFF_ROLE,
  BID_STATUS,
  getCurrentDayName,
  getDateForDay,
  getStartOfDayISO,
  getDayName,
  CHALLENGE_STATUS,
  USER_LEVELS,
  SYSTEM_USER_ROLE,
} from '../utils/user'
import { getLoginLinkByEnv, getSanitizeCompanyName, toObjectId } from '../utils/misc'
import { stripe } from '../utils/stripe'
import Email from '../utils/email'
import { escapeRegex } from '../utils/misc'
import {
  comparePassword,
  decodeToken,
  generateOTToken,
  generatePassword,
  generateToken,
  verifyTOTPToken,
} from '../utils'
import { sendSMS } from '../utils/smsUtil'
import { getIO } from '../socket'

const { ObjectId } = mongoose.Types

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
// const REDIRECT_URI = 'http://localhost:3000/api/user/auth/google/callback'

export const CONTROLLER_AUTH = {
  // ZEAL FITNESS APP APIS

  getCode: asyncMiddleware(async (req, res) => {
    // console.log('INSIDE1')
    const { email } = req.body

    const user = await User.findOne({ email })

    // const name = user.firstName

    if (user) {
      return res.status(400).json({
        message: 'Email provided is already register',
      })
    } else {
      var secret = speakeasy.generateSecret({ length: 20 }).base32
      var token = speakeasy.totp({
        digits: 6,
        secret: secret,
        encoding: 'base32',
        window: 6,
      })

      // console.log('token', token)

      // await sendSMS(`Your time based one time login code is: ${token}`, phoneNumber) // UTL

      const TOTPToken = await generateOTToken({ secret })

      // Find if the document with the phoneNumber exists in the database
      let totp = await TOTP.findOneAndUpdate({ email }, { token: TOTPToken })

      if (isEmpty(totp)) {
        new TOTP({
          email,
          token: TOTPToken,
        }).save()
      }
      const sendEmail = await new Email({ email })
      const emailProps = { token }
      await sendEmail.registerAccount(emailProps)

      res.json({ message: 'Verification code sent' })
    }
  }),

  verifyAccount: asyncMiddleware(async (req, res) => {
    const { email, code } = req.body

    let totp = await TOTP.findOneAndDelete({ email })
    if (!totp) {
      return res.status(400).json({ message: 'No OTP record found or it has already been used.' })
    }

    let decoded = await verifyTOTPToken(totp.token)
    let verified = speakeasy.totp.verify({
      digits: 6,
      secret: decoded.secret,
      encoding: 'base32',
      token: code,
      window: 10,
    })

    if (verified) {
      // const hashedPassword = await generatePassword(newPassword)

      // await User.findOneAndUpdate({ email }, { password: hashedPassword }, { new: true })

      // console.log(`Password updated for ${email}`)
      res.json({ message: 'Account verified successfully' })
    } else {
      res.status(400).json({ message: 'Invalid verification code' })
    }
  }),

  signUp: asyncMiddleware(async (req, res) => {
    let { fullName, email, password, referralLink } = req.body

    const user = await User.findOne({
      email: email,
    })

    if (user)
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Email already exists.',
      })

    const hasedPassword = await generatePassword(password)

    const newUser = new User({
      fullName,
      email,
      password: hasedPassword,
      avatar: 'https://res.cloudinary.com/dxniq2tzt/image/upload/v1744634009/avatar_hrhww5.svg',
      accountType: 'Julip-Account',
      userTypes: USER_TYPES.Basic,
      role: { name: SYSTEM_USER_ROLE.USR, shortName: getRoleShortName(USER_TYPES.USR, SYSTEM_USER_ROLE.USR) },
    })

    // If a referral code is provided, find the referrer
    if (referralLink) {
      const referrer = await User.findById(referralLink)
      if (referrer) {
        newUser.referredBy = referrer._id
        referrer.referredUsers.push(newUser._id)
        await referrer.save()
      }
    }

    await newUser.save()
    // try {
    //   await fetch('https://hooks.zapier.com/hooks/catch/14135409/2x4jcte', {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify({
    //       fullName: newUser.fullName,
    //       email: newUser.email,
    //     }),
    //   })
    // } catch (err) {
    //   console.error('Zapier webhook failed:', err.message)
    // }
    const tokenPayload = {
      _id: newUser._id,
      role: newUser.role,
      userTypes: newUser.userTypes,
    }

    const tokens = await generateToken(tokenPayload)

    ////// sending verification email ///////////////////////////////////////////////////////////////////

    var secret = speakeasy.generateSecret({ length: 20 }).base32
    var token = speakeasy.totp({
      digits: 6,
      secret: secret,
      encoding: 'base32',
      window: 6,
    })
    const TOTPToken = await generateOTToken({ secret })

    // Find if the document with the phoneNumber exists in the database
    let totp = await TOTP.findOneAndUpdate({ email }, { token: TOTPToken })

    if (isEmpty(totp)) {
      new TOTP({
        email,
        token: TOTPToken,
      }).save()
    }
    const sendEmail = await new Email({ email })
    sendEmail.notifyZapierSignup({ fullName: newUser.fullName, email: newUser.email })

    console.log('emailProps', emailProps)
    const emailProps = { code: token }
    // await sendEmail.welcomeToZeal(emailProps)
    sendEmail.confirmEmail(emailProps)

    res.status(StatusCodes.OK).json({
      data: {
        user: { ...newUser._doc },
        ...tokens,
      },
      message: 'User registered successfully',
    })
  }),

  checkemail: asyncMiddleware(async (req, res) => {
    const { email } = req.body
    const sendEmail = await new Email({ email })
    const emailProps = { firstName: 123 }
    console.log('emailProps', emailProps)
    // await sendEmail.welcomeToZeal(emailProps)
    await sendEmail.downgrade(emailProps)
    await sendEmail.upgrade(emailProps)
    await sendEmail.confirmPassword(emailProps)
    await sendEmail.confirmEmail(emailProps)
    await sendEmail.welcomeToZeal(emailProps)
    await sendEmail.emailConfirmation(emailProps)
    res.status(StatusCodes.OK).json({ email: emailProps })
  }),
  resendEmailVerificationCode: asyncMiddleware(async (req, res) => {
    const { email } = req.body

    var secret = speakeasy.generateSecret({ length: 20 }).base32
    var token = speakeasy.totp({
      digits: 6,
      secret: secret,
      encoding: 'base32',
      window: 6,
    })

    const TOTPToken = await generateOTToken({ secret })

    // Find if the document with the phoneNumber exists in the database
    let totp = await TOTP.findOneAndUpdate({ email }, { token: TOTPToken })
    console.log('token resend', token)

    if (isEmpty(totp)) {
      new TOTP({
        email,
        token: TOTPToken,
      }).save()
    }
    const sendEmail = await new Email({ email })
    const emailProps = { firstName: token }
    // await sendEmail.welcomeToZeal(emailProps)
    await sendEmail.confirmEmail(emailProps)
    res.status(StatusCodes.OK).json({
      message: 'Code sent',
    })
  }),

  verifyEmail: asyncMiddleware(async (req, res) => {
    const { email, code } = req.body
    let totp = await TOTP.findOneAndDelete({ email })

    if (!totp) {
      return res.status(400).json({ message: 'No TOTP record found or it has already been used.' })
    }

    let decoded
    try {
      decoded = await verifyTOTPToken(totp.token)
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' })
      } else {
        return res.status(400).json({ message: 'Invalid verification code token.' })
      }
    }

    let verified = speakeasy.totp.verify({
      digits: 6,
      secret: decoded.secret,
      encoding: 'base32',
      token: code,
      window: 10,
    })

    if (verified) {
      const user = await User.findOne({ email })
      user.isEmailVerified = true
      await user.save()
      res.status(200).json({ message: 'Code verified' })
    } else {
      res.status(400).json({ message: 'Invalid verification code' })
    }
  }),

  googleAuth: asyncMiddleware(async (req, res) => {
    const { code } = req.query

    try {
      // Exchange authorization code for tokens
      const { data } = await axios.post(
        'https://oauth2.googleapis.com/token',
        {
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          code,
          redirect_uri: GOOGLE_REDIRECT_URI,
          grant_type: 'authorization_code',
        },
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      )

      const { access_token, id_token } = data

      // Fetch user profile using the access token
      const { data: profile } = await axios.get('https://www.googleapis.com/oauth2/v1/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` },
      })

      const { email, name, picture } = profile

      // Check if the user exists in the database
      let user = await User.findOne({ email })

      if (!user) {
        // Create a new user if they don't exist
        user = new User({
          email,
          name,
          avatar: picture,
          accountType: 'Google-Account',
        })
        await user.save()
      }

      // Generate JWT tokens for the user
      const tokenPayload = {
        _id: user._id,
        email: user.email,
        name: user.name,
      }

      const tokens = generateToken(tokenPayload)

      // Return the tokens and user data
      res.status(StatusCodes.OK).json({
        data: {
          user: { ...user._doc },
          ...tokens,
        },
        message: 'Logged in successfully via Google',
      })
    } catch (error) {
      console.error('Error during Google OAuth:', error.response ? error.response.data : error.message)
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'An error occurred during Google OAuth' })
    }
  }),
  signIn: asyncMiddleware(async (req, res) => {
    const { email, password } = req.body
    const user = await User.findOne({ email }).select('+password')

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'User not found.',
      })
    }

    if (user.accountType === 'Google-Account') {
      return res.status(StatusCodes.FORBIDDEN).json({
        message: 'Not a Zeal fitness account try logging it with google',
      })
    }

    const isAuthenticated = await comparePassword(password, user.password)

    if (!isAuthenticated) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Incorrect Password or Email.',
      })
    }

    delete user.password

    const tokenPayload = {
      _id: user._id,
      role: user.role,
      userTypes: user.userTypes,
    }

    const tokens = await generateToken(tokenPayload)

    if (user && !user.accountType) {
      user.accountType = 'Zeal-Account'
    }
    user.isLoggedIn = true
    await user.save()

    res.status(StatusCodes.OK).json({
      data: {
        user: { ...user._doc },
        tokens,
      },
      message: 'Logged In Successfully',
    })
  }),

  signOut: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded

    if (!userId) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'user id not found' })
    }
    const user = await User.findById(userId)
    console.log('testing', user, userId)

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'User not found' })
    }

    user.isLoggedIn = false
    await user.save()

    res.status(StatusCodes.OK).json({ message: 'Logged out successfully' })
  }),

  forgotPasswordLink: asyncMiddleware(async (req, res) => {
    const { email } = req.body

    const user = await User.findOne({ email })

    if (!user) {
      return res.status(400).json({
        message: 'Email provided is not valid',
      })
    }

    if (user.accountType === 'Google-Account') {
      return res.status(400).json({
        message: 'Not a Julip Account',
      })
    }

    const tokenPayload = {
      email,
    }

    const resetToken = await generateToken(tokenPayload)

    const resetTokenExpiry = Date.now() + 15 * 60 * 1000
    // Save the token and expiry in the user's record
    user.resetToken = resetToken.resetPasswordToken
    user.resetTokenExpiry = resetTokenExpiry
    await user.save()
    let baseUrl
    if (process.env.FRONTEND_URL.includes('localhost')) {
      baseUrl = process.env.FRONTEND_URL_LOCAL
    } else if (process.env.FRONTEND_URL.includes('dev')) {
      baseUrl = process.env.FRONTEND_URL_DEV
    } else if (process.env.FRONTEND_URL.includes('qa')) {
      baseUrl = process.env.FRONTEND_URL_QA
    } else {
      baseUrl = process.env.FRONTEND_URL_PROD
    }
    console.log('qwerty', resetToken)
    // Create the reset URL
    const resetUrl = `${baseUrl}/auth-demo/modern/reset-password?token=${resetToken.resetPasswordToken}`

    // Send email with the reset URL
    const { fullName } = user

    const sendEmail = new Email({ email })
    const emailProps = { resetUrl }
    await sendEmail.sendForgotPassword(emailProps)
    res.json({ message: 'Password reset link sent to your email.' })
  }),

  resetPassword: asyncMiddleware(async (req, res) => {
    // console.log('req', req.body)
    const { token, newPassword } = req.body

    const decoded = await decodeToken(token)
    console.log('decoded', decoded)
    const { email } = decoded
    console.log('decoded', email, decoded)
    // Find the user by the reset token and check token validity
    const user = await User.findOne({
      email: email,
      resetTokenExpiry: { $gt: Date.now() }, // Ensure token hasn't expired
    })

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token.' })
    }

    // Update the user's password
    const hashedPassword = await generatePassword(newPassword)
    user.password = hashedPassword

    // Clear the reset token and expiry
    user.resetToken = undefined
    user.resetTokenExpiry = undefined

    await user.save()

    res.json({ message: 'Password updated successfully.', user })
  }),

  resetPasswordAuthenticatedUser: asyncMiddleware(async (req, res) => {
    const { oldPassword, newPassword } = req.body
    const { _id: userId } = req.decoded

    // Find the user by the reset token and check token validity
    const user = await User.findById(userId).select('password')

    if (!user) {
      return res.status(400).json({ message: 'User not found.' })
    }

    const isOldPasswordValid = await comparePassword(oldPassword, user.password)

    if (!isOldPasswordValid) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Incorrect Password.',
      })
    }

    // Update the user's password
    const hashedPassword = await generatePassword(newPassword)
    user.password = hashedPassword

    await user.save()

    res.json({ message: 'Password updated successfully.' })
  }),

  createSlug: asyncMiddleware(async (req, res) => {
    const { userId, userName } = req.body

    if (!userId || !userName) {
      return res.status(400).json({ message: 'User ID and username are required.' })
    }

    const existingUser = await User.findOne({ userName })
    if (existingUser) {
      return res.status(400).json({ message: 'Username is already taken.' })
    }

    const user = await User.findById(userId)

    if (!user) {
      return res.status(404).json({ message: 'User not found.' })
    }
    if (user.userName) {
      return res.status(400).json({ message: 'Username has already been set and cannot be changed.' })
    }
    user.userName = userName
    user.isSlugCreated = true
    await user.save()

    res.status(200).json({ message: 'Username added successfully.', user })
  }),

  forgotPassword: asyncMiddleware(async (req, res) => {
    // console.log('INSIDE1')
    const { email } = req.body

    const user = await User.findOne({ email })

    const name = user.firstName

    if (!user) {
      return res.status(400).json({
        message: 'Email provided is not valid',
      })
    }

    if (user.accountType === 'Google-Account') {
      return res.status(400).json({
        message: 'Not a Zeal Account',
      })
    }

    var secret = speakeasy.generateSecret({ length: 20 }).base32
    var token = speakeasy.totp({
      digits: 6,
      secret: secret,
      encoding: 'base32',
      window: 6,
    })

    // console.log('token', token)

    // await sendSMS(`Your time based one time login code is: ${token}`, phoneNumber) // UTL

    const TOTPToken = await generateOTToken({ secret })

    // Find if the document with the phoneNumber exists in the database
    let totp = await TOTP.findOneAndUpdate({ email }, { token: TOTPToken })

    if (isEmpty(totp)) {
      new TOTP({
        email,
        token: TOTPToken,
      }).save()
    }
    const sendEmail = await new Email({ email })
    const emailProps = { token, name }
    await sendEmail.sendForgotPassword(emailProps)

    res.json({ message: 'Verification code sent' })
  }),

  verifyUpdatePasswordCode: asyncMiddleware(async (req, res) => {
    const { email, code } = req.body

    let totp = await TOTP.findOneAndDelete({ email })
    if (!totp) {
      return res.status(400).json({ message: 'No TOTP record found or it has already been used.' })
    }

    let decoded = await verifyTOTPToken(totp.token)
    let verified = speakeasy.totp.verify({
      digits: 6,
      secret: decoded.secret,
      encoding: 'base32',
      token: code,
      window: 10,
    })

    if (verified) {
      res.json({ message: 'code verified' })
    } else {
      res.status(400).json({ message: 'Invalid verification code' })
    }
  }),

  forgotPasswordUpdate: asyncMiddleware(async (req, res) => {
    const { email, newPassword } = req.body

    const hashedPassword = await generatePassword(newPassword)

    const user = await User.findOneAndUpdate({ email }, { password: hashedPassword }, { new: true })

    if (!user) {
      return res.status(400).json({ message: 'User not found' })
    }
    // console.log(`Password updated for ${email}`)
    res.json({ message: 'Password updated successfully' })
  }),

  sendNotification: asyncMiddleware(async (req, res) => {
    const { title, body } = req.body

    const token =
      'cJBKoZf7cUpdtPFhbQm5ZE:APA91bEHbnMMtpcvdNz6ZaCWuCvQVD-rwO_ps6xu4Il3ajnXR0g-oGCZAzIJP44upIu5BrUheUWJCRikQH_Vc5DZsx3kVG7pH8A2H1ZBcsX4-M7tYBttefi2Fo3Z4RcHuHq60Z4jEtZU'

    const message = {
      notification: {
        title: 'i am title',
        body: 'body is here',
      },
      token,
    }

    res.json({ message: 'notification sent successfully' })
  }),

  changePassword: asyncMiddleware(async (req, res) => {
    const id = req.query.id
    const { newPassword, oldPassword } = req.body

    const user = await User.findById(id).select('password')

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    const isAuthenticated = await comparePassword(oldPassword, user.password)

    if (!isAuthenticated) {
      return res.status(400).json({ message: 'Password does not matched' })
    }

    // Check if the new password is the same as the old password
    const isSamePassword = await comparePassword(newPassword, user.password)
    if (isSamePassword) {
      return res.status(400).json({ message: 'New password cannot be the same as the old password' })
    }

    const hashedPassword = await generatePassword(newPassword)

    await User.findByIdAndUpdate(id, { password: hashedPassword }, { new: true })

    // console.log(`Password updated for ${email}`)
    res.json({ message: 'Password updated successfully' })
  }),

  OAuth: asyncMiddleware(async (req, res) => {
    const { auth_type, token_id, userID, access_token, fcmToken } = req.body
    const ipAddress = req.ip
    console.log('BODY:', req.body)
    let userData

    switch (auth_type) {
      case 'google':
        userData = await authenticateGoogleUser(token_id)
        if (isEmpty(userData))
          return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Error occurred during google OAUTH' })

        break

      case 'facebook':
        userData = await authenticateFacebookUser(access_token)
        console.log('FACEBOOK', userData)
        if (isEmpty(userData))
          return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Error occurred during facebook OAUTH' })

        break

      default:
        return res.status(StatusCodes.BAD_REQUEST).json({ auth_type: 'Please provide a valid auth type' })
        break
    }

    const { email } = userData

    let userExists = await User.findOne({ email: email }).lean()

    if (isEmpty(userExists)) userExists = await signupOAuthUser(userData, fcmToken)

    if (userExists) {
      if (userExists.accountType !== 'Google-Account') {
        return res.status(StatusCodes.FORBIDDEN).json({
          message: 'Not a Google account try logging it with Zeal fitness account',
        })
      } else {
        await User.findOneAndUpdate({ email: email }, { fcmToken, accountType: 'Google-Account' })
      }
      // userExists.fcmToken = fcmToken
    }
    const response = await signinOAuthUser(userExists, ipAddress, res)

    if (isEmpty(response)) return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Not able to login via OAuth' })
    // await USER_SERVICE.setTokenCookie(res, response.refreshToken)
    res.status(StatusCodes.ACCEPTED).json(response.data)
  }),

  OAuth2: asyncMiddleware(async (req, res) => {
    const { code } = req.body

    try {
      // Exchange authorization code for tokens
      const { data } = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      })

      const { access_token, id_token } = data

      // Fetch user profile using the access token
      const { data: profile } = await axios.get('https://www.googleapis.com/oauth2/v1/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` },
      })

      const { email } = profile

      let userExists = await User.findOne({ email: email })

      let userToLogin

      if (!userExists) {
        // Register new user
        const newUser = new User({
          fullName: profile.name,
          email: profile.email,
          avatar: profile.picture,
          accountType: 'Google-Account',
          userTypes: USER_TYPES.Basic,
          isLoggedIn: true,
        })
        await newUser.save()
        userToLogin = newUser

        // Send welcome email with OTP
        const secret = speakeasy.generateSecret({ length: 20 }).base32
        const token = speakeasy.totp({
          digits: 6,
          secret: secret,
          encoding: 'base32',
          window: 6,
        })

        const TOTPToken = await generateOTToken({ secret })

        let totp = await TOTP.findOneAndUpdate({ email }, { token: TOTPToken })
        if (isEmpty(totp)) {
          await new TOTP({
            email,
            token: TOTPToken,
          }).save()
        }

        const sendEmail = new Email({ email })
        await sendEmail.welcomeToZeal({ firstName: token })
      } else {
        // User exists, log them in
        if (userExists.accountType !== 'Google-Account') {
          return res.status(StatusCodes.FORBIDDEN).json({
            message: 'Not a Google account, try logging in with your Zeal account',
          })
        }
        userExists.isLoggedIn = true
        await userExists.save()
        userToLogin = userExists
      }

      // Generate token
      const tokenPayload = {
        _id: userToLogin._id,
        role: userToLogin.role,
        userTypes: userToLogin.userTypes,
      }
      const tokens = await generateToken(tokenPayload)

      res.status(StatusCodes.OK).json({
        data: {
          user: { ...userToLogin._doc },
          tokens,
        },
        message: userExists ? 'User signed in successfully' : 'User registered successfully',
      })
      // const response = await signinOAuthUser(userExists, ipAddress, res)

      // Handle user authentication and redirection
      // res.redirect('/dashboard') // Redirect to your app's dashboard
    } catch (error) {
      console.error('Error during Google OAuth:', error.response ? error.response.data : error.message)
      res.status(500).send('An error occurred during Google login.')
    }
  }),

  handleAppleCallback: asyncMiddleware(async (req, res) => {
    const { code, user: userRaw } = req.query
    try {
      const userInfo = userRaw ? JSON.parse(userRaw) : null
      console.log(userInfo, 'userInfo', userRaw)
      if (!code) {
        return res.status(400).json({ error: 'Missing authorization code' })
      }

      // 1. Generate Apple Client Secret
      function generateClientSecret() {
        const teamId = 'W7J832VH7L'
        const clientId = 'com.julip.auth.apple'
        const keyId = '453UBF3VUP'
        const privateKey = `-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgoKtJeIIBOqSX0wEb
zDe7ygI4Dv3Tb6AeGUlazgiu7/igCgYIKoZIzj0DAQehRANCAASSUBZz13Q+YtMV
Lv5KzdLu8lUQuXtyvA47whiGciuX34Usw1zJthrAP5e7H4V6d4c+TrYnxESN7oo8
rdmyJfzE
-----END PRIVATE KEY-----`.trim()

        const now = Math.floor(Date.now() / 1000)
        return jwt.sign(
          {
            iss: teamId,
            iat: now,
            exp: now + 15777000,
            aud: 'https://appleid.apple.com',
            sub: clientId,
          },
          privateKey,
          {
            algorithm: 'ES256',
            keyid: keyId,
          }
        )
      }

      const clientSecret = generateClientSecret()

      // 2. Exchange code for tokens
      const tokenResponse = await axios.post('https://appleid.apple.com/auth/token', null, {
        params: {
          client_id: 'com.julip.auth.apple',
          client_secret: clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: 'https://dev.myjulip.com/auth/jwt/login/',
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })

      const { id_token, access_token } = tokenResponse.data
      const decoded = jwt.decode(id_token)
      const { email: appleEmail, sub: appleSub } = decoded
      let user
      console.log('appleSub 11111111111111111111111111111111111111111111', appleSub, appleEmail)
      if (appleSub) {
        user = await User.findOne({ appleSub })
      }
      let isNewUser = false

      if (!user && appleEmail && appleSub) {
        // 3. Create new user
        const newUser = new User({
          email: appleEmail,
          appleSub,
          accountType: 'Apple-Account',
          isLoggedIn: true,
          userTypes: USER_TYPES.Basic,
        })
        await newUser.save()
        user = newUser
        isNewUser = true

        // 4. Send welcome email with OTP
        const secret = speakeasy.generateSecret({ length: 20 }).base32
        const token = speakeasy.totp({
          digits: 6,
          secret: secret,
          encoding: 'base32',
          window: 6,
        })

        const TOTPToken = await generateOTToken({ secret })

        let totp = await TOTP.findOneAndUpdate({ email: appleEmail }, { token: TOTPToken })
        if (!totp) {
          await new TOTP({ email: appleEmail, token: TOTPToken }).save()
        }

        const sendEmail = new Email({ email: appleEmail })
        await sendEmail.welcomeToZeal({ firstName: token })
        user.isLoggedIn = true
      } else if (!appleSub) {
        res.status(400).json({ message: 'Apple ID not linked to any user account' })
      } else if (user) {
        user.isLoggedIn = true
        await user.save()
      }
      // 5. Check if user exists and send JWT tokens
      if (user) {
        const tokenPayload = {
          _id: user._id,
          role: user.role,
          userTypes: user.userTypes,
        }
        const tokens = await generateToken(tokenPayload)

        return res.status(200).json({
          data: {
            user: { ...user._doc }, // Only access _doc if user exists
            tokens,
          },
          message: isNewUser ? 'User registered successfully' : 'User signed in successfully',
        })
      } else {
        return res.status(404).json({
          message: 'User not found or unable to sign in',
        })
      }
    } catch (error) {
      console.error('Apple login error:', error)

      return res.status(500).json({
        message: 'Internal server error during Apple sign-in',
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      })
    }
  }),

  // handleAppleCallback2222222: asyncMiddleware(async (req, res) => {
  //   try {
  //     const { code } = req.query

  //     if (!code) {
  //       return res.status(400).json({ error: 'Missing authorization code' })
  //     }

  //     // 1. Generate Apple Client Secret
  //     function generateClientSecret() {
  //       const teamId = 'W7J832VH7L'
  //       const clientId = 'com.julip.auth.apple'
  //       const keyId = '453UBF3VUP'
  //       const privateKey = `-----BEGIN PRIVATE KEY-----
  // MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgoKtJeIIBOqSX0wEb
  // zDe7ygI4Dv3Tb6AeGUlazgiu7/igCgYIKoZIzj0DAQehRANCAASSUBZz13Q+YtMV
  // Lv5KzdLu8lUQuXtyvA47whiGciuX34Usw1zJthrAP5e7H4V6d4c+TrYnxESN7oo8
  // rdmyJfzE
  // -----END PRIVATE KEY-----`.trim()

  //       const now = Math.floor(Date.now() / 1000)
  //       return jwt.sign(
  //         {
  //           iss: teamId,
  //           iat: now,
  //           exp: now + 15777000,
  //           aud: 'https://appleid.apple.com',
  //           sub: clientId,
  //         },
  //         privateKey,
  //         {
  //           algorithm: 'ES256',
  //           keyid: keyId,
  //         }
  //       )
  //     }

  //     const clientSecret = generateClientSecret()

  //     // 2. Exchange code for tokens
  //     const tokenResponse = await axios.post('https://appleid.apple.com/auth/token', null, {
  //       params: {
  //         client_id: 'com.julip.auth.apple',
  //         client_secret: clientSecret,
  //         code,
  //         grant_type: 'authorization_code',
  //         redirect_uri: 'https://dev.myjulip.com/auth/jwt/login/',
  //       },
  //       headers: {
  //         'Content-Type': 'application/x-www-form-urlencoded',
  //       },
  //     })

  //     console.log('Apple token response:', tokenResponse.data)

  //     const { id_token, access_token } = tokenResponse.data

  //     if (!id_token) {
  //       return res.status(400).json({ error: 'Missing id_token from Apple response' })
  //     }

  //     const decoded = jwt.decode(id_token)
  //     console.log('Decoded Apple ID Token:', decoded)

  //     const { email: appleEmail, sub: appleSub } = decoded
  //     if (!appleSub) {
  //       return res.status(400).json({ message: 'Apple ID not linked to any user account' })
  //     }

  //     let user = await User.findOne({ appleSub })
  //     let isNewUser = false

  //     if (!user && appleEmail && appleSub) {
  //       // 3. Create new user
  //       const newUser = new User({
  //         email: appleEmail,
  //         appleSub,
  //         accountType: 'Apple-Account',
  //         isLoggedIn: true,
  //         userTypes: USER_TYPES.Basic,
  //       })
  //       await newUser.save()
  //       user = newUser
  //       isNewUser = true

  //       // 4. Send welcome email with OTP
  //       const secret = speakeasy.generateSecret({ length: 20 }).base32
  //       const token = speakeasy.totp({
  //         digits: 6,
  //         secret: secret,
  //         encoding: 'base32',
  //         window: 6,
  //       })

  //       const TOTPToken = await generateOTToken({ secret })

  //       let totp = await TOTP.findOneAndUpdate({ email: appleEmail }, { token: TOTPToken })
  //       if (!totp) {
  //         await new TOTP({ email: appleEmail, token: TOTPToken }).save()
  //       }

  //       const sendEmail = new Email({ email: appleEmail })
  //       await sendEmail.welcomeToZeal({ firstName: token })
  //       user.isLoggedIn = true
  //     } else if (user) {
  //       user.isLoggedIn = true
  //       await user.save()
  //     }

  //     // 5. Check if user exists and send JWT tokens
  //     if (user) {
  //       const tokenPayload = {
  //         _id: user._id,
  //         role: user.role,
  //         userTypes: user.userTypes,
  //       }
  //       const tokens = await generateToken(tokenPayload)

  //       return res.status(200).json({
  //         data: {
  //           user: { ...user._doc },
  //           tokens,
  //         },
  //         message: isNewUser ? 'User registered successfully' : 'User signed in successfully',
  //       })
  //     } else {
  //       return res.status(404).json({
  //         message: 'User not found or unable to sign in',
  //         details: { appleSub, appleEmail, decoded },
  //       })
  //     }
  //   } catch (error) {
  //     console.error('Apple login error:', error)

  //     return res.status(500).json({
  //       message: 'Internal server error during Apple sign-in',
  //       error: error.message,
  //       stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
  //     })
  //   }
  // })
}
