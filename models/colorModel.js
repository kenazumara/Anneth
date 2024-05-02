const mongoose = require('mongoose');

// Define schema for individual colors
const colorSchema = new mongoose.Schema({
  color: { type: String, required: true },
  quantity: { type: Number, required: true },
  discountPrice: { type: Number, required: true },
  colorImage: String,
});

const Color = mongoose.model('Color', colorSchema);

module.exports = Color;
