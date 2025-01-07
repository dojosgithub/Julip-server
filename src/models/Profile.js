import { Schema, model } from 'mongoose'

export const profileSchema = new Schema(
  {
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
        url: {
          type: String,
          required: true,
        },
      },
    ],
    webLinks: [
      {
        title: {
          type: String,
          required: true,
        },
        link: {
          type: String,
          required: true,
        },
      },
    ],
    image: Object,
    imageStyle: {
      type: String,
      enum: ['horizontal', 'vertical'],
      default: 'vertical',
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { versionKey: false, timestamps: true }
)

export const Profile = model('Profile', profileSchema)
