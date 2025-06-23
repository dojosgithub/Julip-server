const mongoose = require('mongoose')

const PaymentSchema = new mongoose.Schema({
  paymentId: String,
  customerId: String,
  amount: Number,
  currency: String,
  status: String,
  createdAt: Date,
})

module.exports = mongoose.model('Payment', PaymentSchema)
