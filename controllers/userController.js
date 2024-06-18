const sharp = require('sharp');
const multer = require('multer');
const asyncHandler = require('express-async-handler');

const factory = require('./factoryHandler');
const User = require('../models/userModel');
const Cart = require('../models/cartModel');
const Product = require('../models/productModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Address = require('../models/addressModel');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image. Please upload an image', 400), false);
  }
};

const upload = multer({
  Storage: multerStorage,
  fileFilter: multerFilter,
  limits: { fieldSize: 2000000 }, // 2mb
});

exports.userPhotoUpload = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();
  const userName = req.user.name.split(' ')[0];

  req.file.filename = `${userName}-${req.user.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(100, 100)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);

  next();
});

const filterObj = (obj, ...allowedField) => {
  const newObj = {};
  Object.keys(obj).forEach((key) => {
    if (allowedField.includes(key)) newObj[key] = obj[key];
  });
  return newObj;
};

exports.setUserId = (req, res, next) => {
  if (!req.params.userId) req.params.userId = req.user.id;

  next();
};

exports.getme = (req, res, next) => {
  req.params.id = req.user.id;

  next();
};

exports.deleteUser = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, {
    active: false,
  });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.updateMe = catchAsync(async (req, res, next) => {
  if (req.body.password)
    return next(
      new AppError(
        'You cannot update your password using this route. Use "/updatePassword" instead".',
      ),
    );

  const filteredBody = filterObj(req.body, 'name');
  if (req.file) filteredBody.photo = req.file.filename;

  const user = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});

exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User, { path: 'addresses' });
exports.removeUser = factory.deleteOne(User);
exports.updateUser = factory.updateOne(User);

// USER ADDRESS
exports.createAddress = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const address = {
    street: req.body.street,
    city: req.body.city,
    state: req.body.state,
    zip: req.body.zip,
    country: req.body.country,
    user: userId, // Associate the address with the user
  };

  const userAddress = await Address.create(address);
  res.status(201).json({
    status: 'success',
    data: {
      data: userAddress,
    },
  });
});

exports.getAddress = factory.getAll(Address);
exports.deleteAddress = factory.deleteOne(Address);

// USER CARTS

exports.addCart = asyncHandler(async (req, res) => {
  const { cart } = req.body;

  // Check if cart is defined and is an array
  if (!cart || !Array.isArray(cart)) {
    return res.status(400).json({
      status: 'fail',
      message: 'Cart must be an array and cannot be empty',
    });
  }

  const user = await User.findById(req.user.id);

  // Find the user's cart
  let existingCart = await Cart.findOne({ orderby: user.id });

  if (!existingCart) {
    // If no cart exists, create a new one
    existingCart = new Cart({ orderby: user.id, items: [] });
  }

  const getCartProductPromises = cart.map(async (cartItem) => {
    const product = await Product.findById(cartItem.id);

    const selectedColor = product.color.find((colorItem) =>
      colorItem.color.toLowerCase().includes(cartItem.color.toLowerCase()),
    );

    return {
      product: cartItem.id,
      color: cartItem.color,
      name: product.name,
      description: product.description,
      image: selectedColor.colorImage,
      price: selectedColor.price,
      discountPrice: selectedColor.discountPrice,
      quantity: cartItem.quantity,
      maxQuantity: selectedColor.quantity,
    };
  });

  const products = await Promise.all(getCartProductPromises);

  products.forEach((newItem) => {
    const existingItemIndex = existingCart.items.findIndex(
      (item) =>
        item.product.toString() === newItem.product &&
        item.color === newItem.color,
    );

    if (existingItemIndex > -1) {
      existingCart.items[existingItemIndex].quantity += newItem.quantity;
    } else {
      existingCart.items.push(newItem);
    }
  });

  existingCart.cartSubtotal = existingCart.items
    .reduce((total, item) => total + item.discountPrice * item.quantity, 0)
    .toFixed(2);

  existingCart.totalQuantityOrdered = existingCart.items.reduce(
    (total, item) => total + item.quantity,
    0,
  );

  await existingCart.save();

  res.status(200).json({
    status: 'success',
    data: existingCart,
  });
});

exports.updateCart = asyncHandler(async (req, res, next) => {
  const { itemId, newQuantity, totalAmt } = req.body;

  const cart = await Cart.findOne({ orderby: req.user.id });
  if (!cart) {
    return next(new AppError('No cart found for this user', 404));
  }

  const itemIndex = cart.items.findIndex(
    (item) => item._id.toString() === itemId,
  );

  if (itemIndex === -1) {
    return next(new AppError('Item(s) not found in cart', 404));
  }

  if (newQuantity <= 0) {
    cart.items.splice(itemIndex, 1);
    // Remove item if quantity is zero or less
  } else {
    cart.items[itemIndex].quantity = newQuantity; // Update quantity
  }

  if (!totalAmt || totalAmt === 0) {
    cart.deliveryFee = 0;
  } else {
    cart.deliveryFee = totalAmt.toFixed(2);
  }

  cart.cartSubtotal = cart.items
    .reduce((total, item) => total + item.discountPrice * item.quantity, 0)
    .toFixed(2);

  cart.totalQuantityOrdered = cart.items.reduce(
    (total, item) => total + item.quantity,
    0,
  );
  await cart.populate('orderby');

  await cart.save();

  res.status(200).json({
    status: 'success',
    data: cart,
  });
});

exports.getUserCart = asyncHandler(async (req, res, next) => {
  const { totalAmt } = req.body;
  const cart = await Cart.findOne({ orderby: req.user.id });
  if (!cart || cart.items.length === 0) {
    return next(new AppError('No item(s) found in cart', 404));
  }

  cart.deliveryFee = totalAmt || 0;
  await cart.save();

  res.status(200).json({
    results: cart.items.length,
    status: 'success',
    data: cart,
  });
});

exports.emptyCart = asyncHandler(async (req, res) => {
  await Cart.findOneAndDelete({ orderby: req.user.id });
  res.status(200).json({
    status: 'success',
  });
});
