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
    const { title, visibility, url } = req.body

    if (!title) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'title is required.',
      })
    }

    const contact = new Contact({ title, visibility, url })
    await contact.save()

    res.status(StatusCodes.CREATED).json({
      data: contact,
      message: 'Contact created successfully.',
    })
  }),

  getContact: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded
    const { version = 'draft' } = req.query // Extract version from query params (default to 'draft')

    // Validate the version parameter
    if (!['draft', 'published'].includes(version)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Invalid version. Use "draft" or "published".',
      })
    }

    // Find the user and populate the specified version's contactList
    const user = await User.findById(userId).populate({
      path: 'portfolio',
      populate: {
        path: `${version}.contact.contactList`,
        model: 'Contact',
      },
    })

    // Check if the user or portfolio exists
    if (!user || !user.portfolio) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Portfolio not found.',
      })
    }

    // Extract the contact data for the specified version
    const contactData = user.portfolio[version]?.contact

    // Check if the contact data exists for the specified version
    if (!contactData) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: `No contact data found in the "${version}" version.`,
      })
    }

    // Return the contact data
    res.status(StatusCodes.OK).json({
      data: contactData,
      message: `Contacts retrieved successfully for the "${version}" version.`,
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
    const { title, visibility, url } = req.body
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
      message: 'Contact updated successfully.',
    })
  }),

  updateContact: asyncMiddleware(async (req, res) => {
    const { _id: userId } = req.decoded
    const { version = 'draft' } = req.query
    const { name, visibility, contactList } = req.body

    // Validate userId
    if (!userId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'User ID is required.',
      })
    }

    // Find the portfolio and populate the contactList for the specified version
    const portfolio = await Portfolio.findOne({ userId }).populate({
      path: `${version}.contact.contactList`,
      model: 'Contact',
    })

    // Check if the portfolio exists
    if (!portfolio) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Portfolio not found.',
      })
    }

    // Update the contact field in the specified version
    portfolio[version].contact.name = name || portfolio[version].contact.name
    portfolio[version].contact.visibility =
      visibility !== undefined ? visibility : portfolio[version].contact.visibility
    portfolio[version].contact.contactList = contactList || portfolio[version].contact.contactList

    // Save the updated portfolio
    await portfolio.save()

    // Re-populate the contactList after saving
    await portfolio.populate({
      path: `${version}.contact.contactList`,
      model: 'Contact',
    })

    // Check if the contact data exists
    if (!portfolio[version]?.contact) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Contact not found.',
      })
    }

    // Return the populated contact data
    res.status(StatusCodes.OK).json({
      data: portfolio[version].contact,
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
