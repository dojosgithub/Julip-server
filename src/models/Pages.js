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
        name: {
          type: String,
          required: true,
        },
        pageId: {
          type: mongoose.Schema.Types.ObjectId,
        },
        visibility: {
          type: Boolean,
          default: true,
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
