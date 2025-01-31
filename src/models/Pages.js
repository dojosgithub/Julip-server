import mongoose from 'mongoose'

const pagesSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    pagesList: [
      {
        shop: {
          name: {
            type: String,
            default: 'Shop',
          },
        },
        about: {
          name: {
            type: String,
            default: 'About',
          },
        },
        services: {
          name: {
            type: String,
            default: 'Services',
          },
          sequence: {
            type: Number,
          },
        },
      },
    ],
    // mediaKit: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: 'MediaKit',
    //   required: true,
    // },
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt fields
)

export const Pages = mongoose.model('Pages', pagesSchema)
