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
import { Contact, Portfolio, Product, Shop, User } from '../models'

// * Middlewares
import { asyncMiddleware } from '../middlewares'

const { ObjectId } = mongoose.Types

export const CONTROLLER_CONTACT = {
  createContact: asyncMiddleware(async (req, res) => {
    const { name, visibility, url } = req.body

    if (!name) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Name is required.',
      })
    }

    const contact = new Contact({ name, visibility, url })
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
      data: user.portfolio.contact,
      message: 'Audiences retrieved successfully.',
    })
  }),

  getContactById: asyncMiddleware(async (req, res) => {
    const { id } = req.params

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

  deleteContactById: asyncMiddleware(async (req, res) => {
    const { id } = req.params

    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Contact ID is required.',
      })
    }

    const contact = await Contact.findByIdAndDelete(id)

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

  updateContactById: asyncMiddleware(async (req, res) => {
    const { id } = req.params
    const { title, visibility, url } = req.bady
    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Contact ID is required.',
      })
    }

    const contact = await Contact.findByIdAndUpdate(id, { title, visibility, url }, { new: true })

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
    const { _id: userId } = req.params
    const { name, visibility, contactList } = req.body

    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Contact ID is required.',
      })
    }

    const portfolio = await Portfolio.findOne(userId)

    portfolio.contact = { name, visibility, contactList }
    await portfolio.save()
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

  // createAndupdateContact: asyncMiddleware(async (req, res) => {
  //   const { _id: userId } = req.decoded
  //   const { name, visibility, contactList } = req.body

  //   if (!userId) {
  //     return res.status(StatusCodes.BAD_REQUEST).json({
  //       message: 'User ID is required.',
  //     })
  //   }

  //   // Find the user by ID and populate the portfolio and contact
  //   const user = await User.findById(userId).populate({
  //     path: 'portfolio',
  //     populate: {
  //       path: 'contact',
  //       model: 'Contact',
  //     },
  //   })

  //   if (!user) {
  //     return res.status(StatusCodes.NOT_FOUND).json({
  //       message: 'User not found.',
  //     })
  //   }

  //   let updatedContact

  //   // Check if the user has a portfolio
  //   if (!user.portfolio) {
  //     // Create a new portfolio for the user
  //     const newPortfolio = new Portfolio({ user: user._id })
  //     user.portfolio = newPortfolio
  //     await user.save()
  //     await newPortfolio.save()
  //   }

  //   // Check if the portfolio has a contact
  //   if (!user.portfolio.contact) {
  //     // Create a new contact for the portfolio
  //     const newContact = new Contact({
  //       name,
  //       visibility,
  //       contactList,
  //     })
  //     user.portfolio.contact = newContact
  //     await user.portfolio.save()
  //     await newContact.save()
  //     updatedContact = newContact
  //   } else {
  //     // Update the existing contact
  //     updatedContact = await Contact.findByIdAndUpdate(
  //       user.portfolio.contact._id,
  //       { name, visibility, contactList },
  //       { new: true }
  //     )
  //   }

  //   if (!updatedContact) {
  //     return res.status(StatusCodes.NOT_FOUND).json({
  //       message: 'Contact not found.',
  //     })
  //   }

  //   res.status(StatusCodes.OK).json({
  //     data: updatedContact,
  //     message: 'Contact updated successfully.',
  //   })
  // }),

  // deleteContactItem: asyncMiddleware(async (req, res) => {
  //   const { _id: userId } = req.decoded // ID of the User document
  //   const { title } = req.query // Title of the contactItem to delete

  //   // Validate input
  //   if (!userId) {
  //     return res.status(StatusCodes.BAD_REQUEST).json({
  //       message: 'User ID is required.',
  //     })
  //   }

  //   if (!title) {
  //     return res.status(StatusCodes.BAD_REQUEST).json({
  //       message: 'Contact Item title is required.',
  //     })
  //   }

  //   // Find the User document by ID and populate the portfolio and contact
  //   const user = await User.findById(userId).populate({
  //     path: 'portfolio',
  //     populate: {
  //       path: 'contact',
  //       model: 'Contact',
  //     },
  //   })

  //   if (!user) {
  //     return res.status(StatusCodes.NOT_FOUND).json({
  //       message: 'User not found.',
  //     })
  //   }

  //   if (!user.portfolio) {
  //     return res.status(StatusCodes.NOT_FOUND).json({
  //       message: 'Portfolio not found.',
  //     })
  //   }

  //   if (!user.portfolio.contact) {
  //     return res.status(StatusCodes.NOT_FOUND).json({
  //       message: 'Contact not found.',
  //     })
  //   }

  //   // Find the contactItem in the contactList by its title
  //   const contactItemIndex = user.portfolio.contact.contactList.findIndex((item) => item.title === title)

  //   if (contactItemIndex === -1) {
  //     return res.status(StatusCodes.NOT_FOUND).json({
  //       message: 'Contact Item not found.',
  //     })
  //   }

  //   // Remove the contactItem from the contactList
  //   user.portfolio.contact.contactList.splice(contactItemIndex, 1)

  //   // Save the updated Contact document
  //   await user.portfolio.contact.save()

  //   res.status(StatusCodes.OK).json({
  //     data: user.portfolio.contact,
  //     message: 'Contact Item deleted successfully.',
  //   })
  // }),
}
