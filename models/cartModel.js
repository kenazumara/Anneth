const mongoose = require('mongoose'); // Erase if already required

// Declare the Schema of the Mongo model
const cartSchema = new mongoose.Schema(
  {
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
        },
        quantity: Number,
        color: String,
        price: Number,
        discountPrice: Number,
        name: String,
        description: String,
        image: String,
        maxQuantity: Number,
        // id: String
      },
    ],
    cartSubtotal: Number,
    deliveryFee: {
      type: Number,
      set: (v) => parseFloat(v.toFixed(2)),
    },
    cartTotal: Number,
    totalQuantityOrdered: Number,
    totalAfterDiscount: Number,
    orderby: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  },
);

//Export the model
module.exports = mongoose.model('Cart', cartSchema);

