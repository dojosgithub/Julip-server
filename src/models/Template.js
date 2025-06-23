import { Schema, model } from 'mongoose'

const TemplateContentSchema = {
  name: {
    type: String,
    required: true,
  },
  mode: {
    type: String,
    enum: ['light', 'dark'],
    default: 'light',
  },
  colors: {
    dark: {
      main: {
        type: String,
        required: true,
      },
      background: {
        type: String,
        required: true,
      },
      buttons: {
        type: String,
        required: true,
      },
    },
    light: {
      main: {
        type: String,
        required: true,
      },
      background: {
        type: String,
        required: true,
      },
      buttons: {
        type: String,
        required: true,
      },
    },
  },

  fonts: {
    header: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
  },
}

export const templateSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    // Draft version of the profile
    draft: TemplateContentSchema,
    // Published version of the profile
    published: TemplateContentSchema,
    lastPublishedAt: {
      type: Date,
      default: Date.now,
    },
    predefined: {
      type: Boolean,
      default: false,
    },
  },
  { versionKey: false, timestamps: true }
)

export const Template = model('Template', templateSchema)
