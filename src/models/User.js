import mongoose, { Schema, model } from 'mongoose'
import { DOC_STATUS, USER_ROLE } from '../utils/user'
import crypto from 'crypto'
import Joi from 'joi'
import mongoosePaginate from 'mongoose-paginate-v2'
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2'

export const userSchema = new Schema(
  {
    fullName: String,
    email: {
      type: String,
      required: true,
      unique: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    }, // added
    resetToken: String, // added
    resetTokenExpiry: Date, // added
    stripeAccountId: String, // added
    refferalLink: String,
    userName: {
      type: String,
      unique: true,
      sparse: true, // Ensures null values are not indexed for uniqueness
    }, // added
    isSlugCreated: {
      type: Boolean,
      default: false,
    },
    isProfileCreated: {
      type: Boolean,
      default: false,
    },
    isTemplateSelected: {
      type: Boolean,
      default: false,
    },

    isPricingSelected: {
      type: Boolean,
      default: false,
    },
    avatar: Object,
    password: { type: String, select: false },
    // username: String,
    accountType: String,
    role: Object,
    subscriptionId: {
      type: String,
    },
    userTypes: {
      type: String,
      enum: ['Premium', 'Basic'],
      default: 'Basic',
    },
    refreshTokens: [String],
    isLoggedIn: {
      type: Boolean,
      default: false,
    },
    lastActive: {
      type: Date,
    },
    profile: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
    },
    shop: {
      type: Schema.Types.ObjectId,
      ref: 'Shop',
    },
    about: {
      type: Schema.Types.ObjectId,
      ref: 'About',
    },
    services: {
      type: Schema.Types.ObjectId,
      ref: 'Services',
    },
    template: {
      type: Schema.Types.ObjectId,
      ref: 'Template',
    },
    analytics: {
      type: Schema.Types.ObjectId,
      ref: 'Analytics',
    },
    pages: {
      type: Schema.Types.ObjectId,
      ref: 'Pages',
    },
    portfolio: {
      type: Schema.Types.ObjectId,
      ref: 'Portfolio',
    },
  },
  { versionKey: false, timestamps: true }
)
//
userSchema.methods.createEmailVerifyToken = function () {
  const emailToken = crypto.randomBytes(32).toString('hex')

  this.emailToken = crypto.createHash('sha256').update(emailToken).digest('hex')

  return emailToken
}

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex')

  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex')

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000

  return resetToken
}

export const validateRegistration = (obj) => {
  const schema = Joi.object({
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    email: Joi.string().email({ minDomainSegments: 2 }).required(),
    password: Joi.string().required(),
    gender: Joi.string(),
    // age: Joi.string(),
    // location: Joi.string(),
    username: Joi.string(),
    // about: Joi.string(),
    // weight: Joi.object({
    //   value: Joi.number(),
    //   unit: Joi.string().valid('imperial', 'metric'),
    // }),
    // height: Joi.object({
    //   value: Joi.number(),
    //   unit: Joi.string().valid('imperial', 'metric'),
    // }),
  }).options({ abortEarly: false })

  return schema.validate(obj)
}
userSchema.plugin(mongooseAggregatePaginate)

export const User = model('User', userSchema)
