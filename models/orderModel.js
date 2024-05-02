const mongoose = require('mongoose'); // Erase if already required

const orderSchema = new mongoose.Schema(
  {
    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
        },
        quantity: Number,
        price: Number,
        name: String,
        image: String,
        color: String,
      },
    ],
    totalAmonut: Number,
    paymentIntent: {
      type: String, // Assuming you'll store Stripe payment intent ID
      // required: true
    },
    paymentStatus: String,
    orderStatus: {
      type: String,
      default: 'Not Processed',
      enum: [
        'Not Processed',
        'Cash on Delivery',
        'Processing',
        'Dispatched',
        'Cancelled',
        'Delivered',
      ],
    },
    phone: Number,
    orderby: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    shippingAddress: {
      // type: mongoose.Schema.Types.ObjectId,
      // ref: 'Address',
      type: String
    },
    // Add any other fields related to orders, such as status, shipping details, etc.
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('Order', orderSchema);
