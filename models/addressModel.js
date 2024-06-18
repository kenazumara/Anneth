const mongoose = require('mongoose'); 

const addressSchema = new mongoose.Schema({
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zip: { type: String },
  country: { type: String, required: true },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'An address must have a user'],
  },
});

const Address = mongoose.model('Address', addressSchema);

module.exports = Address;
