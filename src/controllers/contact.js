// * Libraries
import { StatusCodes } from 'http-status-codes'
import { isEmpty, isUndefined, concat, cloneDeep } from 'lodash'
import speakeasy, { totp } from 'speakeasy'
import mongoose, { model } from 'mongoose'
const axios = require('axios')
import passport from 'passport'
import dotenv from 'dotenv'

dotenv.config()

// * Models
import { Contact, Product, Shop, User } from '../models'

// * Middlewares
import { asyncMiddleware } from '../middlewares'

const { ObjectId } = mongoose.Types

export const CONTROLLER_CONTACT = {
  createContact: asyncMiddleware(async (req, res) => {
    const { name, visibility, contactList } = req.body

    if (!name) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Name is required.',
      })
    }

    const contact = new Contact({ name, visibility, contactList })
    await contact.save()

    res.status(StatusCodes.CREATED).json({
      data: contact,
      message: 'Contact created successfully.',
    })
  }),

  getContact: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded
    const user = await User.findById(userId).populate({
      path: 'portfolio',
      populate: {
        path: 'contact',
        model: 'Contact',
      },
    })
    res.status(StatusCodes.OK).json({
      data: user,
      message: 'Audiences retrieved successfully.',
    })
  }),

  getContactById: asyncMiddleware(async (req, res) => {
    const { id } = req.query

    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Contact ID is required.',
      })
    }

    const contact = await Contact.findById(id)

    if (!contact) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Contact not found.',
      })
    }

    res.status(StatusCodes.OK).json({
      data: contact,
      message: 'Contact retrieved successfully.',
    })
  }),

  updateContact: asyncMiddleware(async (req, res) => {
    const { id } = req.query
    const { name, visibility, contactList } = req.body

    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Contact ID is required.',
      })
    }

    const updatedContact = await Contact.findByIdAndUpdate(id, { name, visibility, contactList }, { new: true })

    if (!updatedContact) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Contact not found.',
      })
    }

    res.status(StatusCodes.OK).json({
      data: updatedContact,
      message: 'Contact updated successfully.',
    })
  }),

  deleteContact: asyncMiddleware(async (req, res) => {
    const { id } = req.query

    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Contact ID is required.',
      })
    }

    const deletedContact = await Contact.findByIdAndDelete(id)

    if (!deletedContact) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Contact not found.',
      })
    }

    res.status(StatusCodes.OK).json({
      message: 'Contact deleted successfully.',
    })
  }),
}
