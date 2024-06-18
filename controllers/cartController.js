/* eslint-disable */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const asyncHandler = require('express-async-handler');

const Cart = require('../models/cartModel');
const Order = require('../models/orderModel');
const Address = require('../models/addressModel');
const factory = require('./factoryHandler');
const AppError = require('../utils/appError');

exports.qtySold = asyncHandler(async (req, res, next) => {
  const orderCookie = req.cookies.order;
  const cartCookie = req.cookies.cart;

  if (!orderCookie || !cartCookie) {
    return next(new AppError('No order or cart information found', 400));
  }

  // YET TO BE IMPLEMENTED (TODO)

  // const selectedColors = cart.items.map((el) => el.color);
  // const productsToUpdate = [];

  // for (const item of order.products) {
  //   const prodId = item.product;
  //   const product = await Product.findById(prodId);

  //   const selectedColor = product.color.find((colorItem) =>
  //     selectedColors.some((color) =>
  //       colorItem.color.toLowerCase().includes(color.toLowerCase())
  //     ),
  //   );

  //   if (!selectedColor) {
  //     return res.status(400).json({ error: `Color not found for product ${prodId}` });
  //   }

  //   const quantitySold = +item.quantity;
  //   if (quantitySold > selectedColor.quantity) {
  //     return res.status(400).json({ error: `Not enough stock for product ${prodId}` });
  //   }

  //   productsToUpdate.push({
  //     updateOne: {
  //       filter: { _id: prodId, 'color.color': selectedColor.color },
  //       update: {
  //         $inc: { sold: quantitySold },
  //         $set: { 'color.$.quantity': selectedColor.quantity - quantitySold },
  //       },
  //     },
  //   });
  // }

  // await Product.bulkWrite(productsToUpdate);

  res.status(200).json({
    status: 'success',
    session: req.session.id,
    // order,
  });
});

exports.checkoutSession = asyncHandler(async (req, res, next) => {
  const cart = await Cart.findOne({ orderby: req.user.id });
  console.log(cart);

  if (!cart) {
    return next(new AppError('No cart found for this user', 404));
  }

  const address = await Address.findOne({ user: req.user.id });

  const lineItems = cart.items.map((product) => ({
    price_data: {
      currency: 'usd',
      product_data: {
        name: `${product.name} product`,
        // description: product.description,
        images: [
          'https://ng.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/32/4954372/1.jpg?6374',
        ],
      },
      unit_amount: Math.round(product.discountPrice * 100),
    },
    quantity: product.quantity,
  }));

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    success_url: `${req.protocol}://localhost:4200/products`,
    cancel_url: `${req.protocol}://localhost:4200/shipping-option`,
    customer_email: req.user.email,
    client_reference_id: cart._id.toString(),
    line_items: lineItems,
    shipping_options: [
      {
        shipping_rate_data: {
          type: 'fixed_amount',
          fixed_amount: {
            amount: Math.round(cart.deliveryFee * 100), // Amount in the smallest currency unit, e.g., cents for USD
            currency: 'usd',
          },
          display_name: 'Standard Shipping',
          delivery_estimate: {
            minimum: {
              unit: 'business_day',
              value: 3,
            },
            maximum: {
              unit: 'business_day',
              value: 9,
            },
          },
        },
      },
    ],
  });

  if (!address) {
    return next(new AppError('No address found', 404));
  }

  const order = new Order({
    orderby: req.user.id,
    products: cart.items,
    totalAmount: cart.cartTotal,
    phone: req.user.phone,
    paymentIntent: session.payment_intent,
    paymentStatus: session.payment_status,
    shippingAddress: `${address.street}. ${address.city} ${address.state}, ${address.country}`,
  });

  if (session.payment_intent) {
    // Simulate determining payment outcome based on response from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(
      session.payment_intent,
    );

    let paymentSucceeded = false;
    let paymentPending = false;
    let paymentFailed = false;

    if (paymentIntent.status === 'succeeded') {
      paymentSucceeded = true;
    } else if (
      paymentIntent.status === 'requires_action' ||
      paymentIntent.status === 'requires_payment_method' ||
      paymentIntent.status === 'null'
    ) {
      paymentPending = true;
    } else if (
      paymentIntent.status === 'canceled' ||
      paymentIntent.status === 'failed'
    ) {
      paymentFailed = true;
    }

    // Set initial order status based on payment stage
    if (paymentSucceeded) {
      order.orderStatus = 'Processing'; // Payment successful, order processing
    } else if (paymentPending) {
      order.orderStatus = 'Cash on Delivery'; // Payment pending, cash on delivery
    } else if (paymentFailed) {
      order.orderStatus = 'Cancelled'; // Payment failed, order cancelled
    }
  }

  await order.save();
  req.session = session;
  req.order = order;
  req.cart = cart;

  // Cookie options
  const setCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Set to true if in production
    sameSite: 'None', // Set to 'None' for cross-site requests
  };

  res.cookie('order', JSON.stringify(order), setCookieOptions);
  res.cookie('cart', JSON.stringify(cart), setCookieOptions);

  res.status(200).json({
    status: 'success',
    res: session,
    session: session.id,
  });
});

exports.webhooks = asyncHandler(async (req, res, next) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    return next(new AppError('Webhook signature verification failed', 400));
  }

  res.status(200).send(`Webhook received successfully, ${req.originalUrl}`);
});

exports.allOrders = factory.getAll(Order);
