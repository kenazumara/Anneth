/* eslint-disable */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const asyncHandler = require('express-async-handler');

const Cart = require('../models/cartModel');
const Product = require('../models/productModel');
const Order = require('../models/orderModel');
const Address = require('../models/addressModel');
const factory = require('./factoryHandler');
const AppError = require('../utils/appError');


exports.qtySold = asyncHandler(async (req, res, next) => {
  const order = req.order;
  const session = req.session;
  const productsToUpdate = [];

  const ele = req.cart.products.map((el) => el.color);

  for (const item of order.products) {
    const prodId = item.product;
    const product = await Product.findById(prodId);

    // Find the selected color in the product
    const selectedColor = product.color.find((colorItem) =>
      ele.some((color) =>
        colorItem.color.toLowerCase().includes(color.toLowerCase()),
      ),
    );

    // Validate quantity sold
    const quantitySold = +item.quantity;
    if (quantitySold > selectedColor.quantity) {
      return res.status(400).json({ error: `Not enough stock for product ${prodId}` });
    }

    // Prepare update object for bulk operation
    productsToUpdate.push({
      updateOne: {
        filter: { _id: prodId, 'color.color': selectedColor.color },
        update: {
          $inc: { sold: quantitySold },
          $set: { 'color.$.quantity': selectedColor.quantity - quantitySold },
        },
      },
    });
  }

    // Perform bulk update
    await Product.bulkWrite(productsToUpdate);
    
    res.status(200).json({
      status: 'success',
      session,
      order,
    });
  //   // Handle database errors
  //   console.error('Error updating products:', error);
  //   res.status(500).json({ error: 'Internal server error' });
  // }
});

exports.checkoutSession = asyncHandler(async (req, res, next) => {
  // 1) Get the cart for the current user
  const cart = await Cart.findOne({ orderby: req.user.id });

  // 2) Prepare line items for the checkout session
  const lineItems = cart.products.map((product) => ({
    price_data: {
      currency: 'usd',
      product_data: {
        name: `${product.name} product`,
        description: product.description,
        images: [
          'https://ng.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/32/4954372/1.jpg?6374',
        ],
      },
      unit_amount: product.price * 100, // Convert price to cents
    },
    quantity: product.quantity,
  }));

  // 3) Create checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    success_url: `${req.protocol}://${req.get('host')}/checkout/success`,
    cancel_url: `${req.protocol}://${req.get('host')}/checkout/cancel`,
    customer_email: req.user.email,
    client_reference_id: cart._id, // Use cart ID as client reference ID
    line_items: lineItems, // Use the prepared line items
  });

  const address = await Address.findOne({ user: req.user.id });

  // 4) Create order in your database
  const order = new Order({
    orderby: req.user.id,
    products: cart.products,
    totalAmount: cart.cartTotal,
    phone: req.user.phone,
    paymentIntent: session.payment_intent, // Capture payment intent ID
    paymentStatus: session.payment_status,
    shippingAddress: `${address.street}. ${address.city} ${address.state}, ${address.country}`, // Assuming you have a shipping address in the request body
  });

  // await order.populate('orderby', 'name phone email')

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
  // Order is dispatched
  // if (orderDispatched) {
  //   order.orderStatus = "Dispatched";
  // }

  // // Order is delivered
  // if (orderDelivered) {
  //   order.orderStatus = "Delivered";
  // }

  await order.save();
  req.session = session;
  req.order = order;
  req.cart = cart;

  next();
  // res.status(200).json({
  //   status: 'success',
  //   session,
  //   order,
  // });
});

// After a successful purchase, handle the checkout success flow
// exports.qtySold = asyncHandler(async (req, res, next) => {
//   // Retrieve the order details (e.g., from req.session or database)
//   const order = req.order;
//   const session = req.session;

//   // if (order.paymentStatus !== 'paid')
//   //   return next(new AppError('Payment not successful.', 404));

//   let ele = req.cart.products.map((el) => el.color);

//   for (const item of order.products) {
//     console.log(item.product);
//     const prodId = item.product;
//     const product = await Product.findById(prodId);

//     const selectedColor = product.color.find((colorItem) =>
//       ele.some((color) =>
//         colorItem.color.toLowerCase().includes(color.toLowerCase()),
//       ),
//     );
//     // console.log(selectedColor);

//     const totalQuantitySold = order.products.reduce(
//       (total, item) => total + item.quantity,
//       0,
//     );
//     const productId = item.product;
//     const quantitySold = +item.quantity;
//     selectedColor.quantity = selectedColor.quantity - item.quantity;

//     const qty = selectedColor.quantity;

//     // Update total quantity sold for the product
//     await Product.findByIdAndUpdate(
//       productId,
//       {
//         $inc: { sold: quantitySold },
//         $set: { 'color.$[elem].quantity': selectedColor.quantity },
//       },
//       {
//         arrayFilters: [{ 'elem.color': selectedColor.color }], // Specify your condition here
//       },
//     );
//   }

//   // Clear the order from session or perform any other necessary cleanup

//   // Render a success message or redirect to a success page
//   // res.status(200).json({
//   //   status: 'success',
//   //   order,
//   // });

//   res.status(200).json({
//     status: 'success',
//     session,
//     order,
//   });

//   // } catch (error) {
//   //   // Handle errors
//   //   console.error('Error updating total quantities sold:', error);
//   //   res.status(500).send('Internal Server Error');
//   // }
// });

// exports.qtySold = asyncHandler(async (req, res, next) => {
//   const order = req.order;
//   const session = req.session;

//   const ele = req.cart.products.map((el) => el.color);

//   for (const item of order.products) {
//     const prodId = item.product;
//     const product = await Product.findById(prodId);

//     // Find the selected color in the product
//     const selectedColor = product.color.find((colorItem) =>
//       ele.some((color) =>
//         colorItem.color.toLowerCase().includes(color.toLowerCase()),
//       ),
//     );

//     // Calculate the quantity sold for the current product/color combination
//     const quantitySold = +item.quantity;

//     // Update the quantity sold for the current product/color combination
//     await Product.findByIdAndUpdate(
//       prodId,
//       {
//         $inc: { sold: quantitySold },
//         $set: { 'color.$[elem].quantity': selectedColor.quantity - quantitySold },
//       },
//       {
//         arrayFilters: [{ 'elem.color': selectedColor.color }],
//       },
//     );
//   }

//   res.status(200).json({
//     status: 'success',
//     session,
//     order,
//   });
// });

// exports.qtySold = asyncHandler(async (req, res, next) => {
//   const order = req.order;

//   for (const item of order.products) {
//     const prodId = item.product;
//     const selectedColor = item.color; // Get the selected color for the current product

//     // Find the product by ID and color
//     const product = await Product.findOne({ _id: prodId, 'color.color': selectedColor });

//     if (!product) {
//       // Handle case where product or color is not found
//       continue; // Skip to the next item in the order
//     }

//     // Find the specific color variant within the product
//     const colorVariant = product.color.find(color => color.color === selectedColor);

//     if (!colorVariant) {
//       // Handle case where color variant is not found
//       continue; // Skip to the next item in the order
//     }

//     // Update total quantity sold for the product color variant
//     await Product.updateOne(
//       { _id: prodId, 'color.color': selectedColor },
//       { $inc: { 'color.$.quantity': -item.quantity } }
//     );
//   }

//   // Clear the order from session or perform any other necessary cleanup

//   // Respond with success message or appropriate status
//   res.status(200).json({
//     status: 'success',
//     order,
//   });
// });

// exports.qtySold = asyncHandler(async (req, res, next) => {
//   const order = req.order;

//   for (const item of order.products) {
//     const prodId = item.product;
//     const selectedColor = item.color; // Get the selected color for the current product

//     // Find the product by ID and color
//     const product = await Product.findOne({ _id: prodId, 'color.color': selectedColor });

//     if (!product) {
//       // Handle case where product or color is not found
//       continue; // Skip to the next item in the order
//     }

//     // Find the specific color variant within the product
//     const colorVariant = product.color.find(color => color.color === selectedColor);

//     if (!colorVariant) {
//       // Handle case where color variant is not found
//       continue; // Skip to the next item in the order
//     }

//     // Update total quantity sold for the product color variant
//     const quantitySold = -item.quantity; // Deduct the ordered quantity
//     await Product.updateOne(
//       { _id: prodId, 'color.color': selectedColor },
//       { $inc: { 'color.$.quantity': quantitySold } }
//     );
//   }

//   // Clear the order from session or perform any other necessary cleanup

//   // Respond with success message or appropriate status
//   res.status(200).json({
//     status: 'success',
//     order,
//   });
// });

// exports.qtySold = asyncHandler(async (req, res, next) => {
//   const order = req.order;

//   // Iterate over each product in the order
//   for (const item of order.products) {
//     const productId = item.product;
//     const product = await Product.findById(productId);

//     // Iterate over each color variant of the product
//     for (const colorVariant of product.color) {
//       // Find the color variant corresponding to the order item
//       if (colorVariant.color === item.color) {
//         // Deduct the quantity from the color variant
//         colorVariant.quantity -= item.quantity;
//         break; // Exit the loop once the color variant is found
//       }
//     }

//     // Update the product in the database with the modified color variants
//     await product.save();
//   }

//   // Render a success message or redirect to a success page
//   res.status(200).json({
//     status: 'success',
//     message: 'Quantity deducted successfully',
//   });
// });

// exports.qtySold = asyncHandler(async (req, res, next) => {
//   const order = req.order;
//   const session = req.session;

//   let ele = req.cart.products.map((el) => el.color);

//   for (const item of order.products) {
//     const prodId = item.product;
//     const product = await Product.findById(prodId);

//     const selectedColor = product.color.find((colorItem) =>
//       ele.some((color) =>
//         colorItem.color.toLowerCase().includes(color.toLowerCase()),
//       ),
//     );

//     const totalQuantitySold = order.products.reduce(
//       (total, item) => total + item.quantity,
//       0,
//     );
//     const productId = item.product;
//     const quantitySold = +item.quantity;
//     selectedColor.quantity = selectedColor.quantity - item.quantity;

//     const qty = selectedColor.quantity;

//     await Product.findByIdAndUpdate(
//       productId,
//       {
//         $inc: { sold: quantitySold },
//         $set: { 'color.$[elem].quantity': selectedColor.quantity },
//       },
//       {
//         arrayFilters: [{ 'elem.color': selectedColor.color }],
//       },
//     );
//   }

//   res.status(200).json({
//     status: 'success',
//     session,
//     order,
//   });
// });


// exports.qtySold = asyncHandler(async (req, res, next) => {
//   const order = req.order;
//   const session = req.session;

//   let ele = req.cart.products.map((el) => el.color);

//   // Calculate total quantity sold for each product
//   const totalQuantitySoldMap = {};
//   for (const item of order.products) {
//     const productId = item.product;
//     totalQuantitySoldMap[productId] = (totalQuantitySoldMap[productId] || 0) + item.quantity;
//   }

//   // Update product quantities
//   for (const item of order.products) {
//     const prodId = item.product;
//     const product = await Product.findById(prodId);

//     const selectedColor = product.color.find((colorItem) =>
//       ele.some((color) =>
//         colorItem.color.toLowerCase().includes(color.toLowerCase()),
//       ),
//     );

//     const productId = item.product;
//     const quantitySold = totalQuantitySoldMap[productId]; // Use total quantity sold for the product

//     selectedColor.quantity -= quantitySold;

//     await Product.findByIdAndUpdate(
//       productId,
//       {
//         $inc: { sold: quantitySold },
//         $set: { 'color.$[elem].quantity': selectedColor.quantity },
//       },
//       {
//         arrayFilters: [{ 'elem.color': selectedColor.color }],
//       },
//     );
//   }

//   res.status(200).json({
//     status: 'success',
//     session,
//     order,
//   });
// });





exports.webhooks = asyncHandler(async (req, res, next) => {
  // Handle incoming webhook event
  // Verify webhook signature
  const sig = req.headers['stripe-signature'];
  let event;
  event = stripe.webhooks.constructEvent(
    req.body,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET,
  );
  // console.error('Webhook signature verification failed:');
  if (!event) return next(new AppError(404));
  // return res.status(400).send('Webhook Error: Invalid Signature');

  // Process event data and take appropriate actions
  res.status(200).send(`Webhook received successfully, ${req.originalUrl}`);
});

exports.allOrders = factory.getAll(Order);
