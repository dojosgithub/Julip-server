const admin = require('firebase-admin')

export const sendPushNotification = ({ token, notification }) => {
  const message = {
    notification,
    token,
  }
}
