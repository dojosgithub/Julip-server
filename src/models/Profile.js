import { Schema, model } from 'mongoose'

const profileContentSchema = {
  bio: String,
  profileName: String,
  description: String,
  socialLinks: [
    {
      platform: {
        type: String,
        enum: [
          'Instagram',
          'TikTok',
          'YouTube',
          'Facebook',
          'Discord',
          'Threads',
          'LinkedIn',
          'Pinterest',
          'Spotify',
          'Snapchat',
        ],
        required: true,
      },
      username: {
        type: String,
        required: true,
      },
      url: {
        type: String,
        required: true,
      },
      visibility: {
        type: Boolean,
        default: true,
      },
    },
  ],
  webLinks: [
    {
      title: {
        type: String,
        required: true,
      },
      url: {
        type: String,
        required: true,
      },
      visibility: {
        type: Boolean,
        default: true,
      },
    },
  ],
  featuredLink: {
    title: {
      type: String,
    },
    url: {
      type: String,
    },
  },
  image: {
    type: String,
    default: 'https://res.cloudinary.com/dojo-dev/image/upload/v1737554504/Julip-dev/placeholder_gbwwzr.jpg',
  },
  imageStyle: {
    type: String,
    enum: ['horizontal', 'vertical'],
    default: 'vertical',
  },
}

// Updated profile schema with draft and published versions
export const profileSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    // Draft version of the profile
    draft: profileContentSchema,
    // Published version of the profile
    published: profileContentSchema,
    lastPublishedAt: {
      type: Date,
      default: null,
    },
    isDraft: {
      type: Boolean,
      default: false,
    },
  },
  { versionKey: false, timestamps: true }
)

export const Profile = model('Profile', profileSchema)
