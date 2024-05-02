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

// const orderModel = require('../models/orderModel');

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
exports.getUser = factory.getOne(User);
exports.removeUser = factory.deleteOne(User);
exports.updateUser = factory.updateOne(User);

// USER ADDRESS
exports.createAddress = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const address = new Address({
    street: req.body.street,
    city: req.body.city,
    state: req.body.state,
    zip: req.body.zip,
    country: req.body.country,
    user: userId, // Associate the address with the user
  });

  await address.save();
  res.status(201).json({
    status: 'success',
    data: {
      address,
    },
  });
});

// USER CARTS
exports.createUserCart = asyncHandler(async (req, res) => {
  const { cart } = req.body;
  // const products = [];

  const user = await User.findById(req.user.id);

  // check if user already have product in cart
  const alreadyExistCart = await Cart.findOne({ orderby: user._id });
  if (alreadyExistCart) {
    await Cart.deleteOne({ _id: alreadyExistCart._id });
  }

  const getCartProductPromises = cart.map(async (cartItem) => {
    const product = await Product.findById(cartItem._id);

    const selectedColor = product.color.find((colorItem) =>
      colorItem.color.toLowerCase().includes(cartItem.color.toLowerCase()),
    );

    // Calculate price based on selected color
    // const price = selectedColor.discountPrice;
    // console.log(selectedColor);

    return {
      price: selectedColor.discountPrice,
      quantity: cartItem.quantity,
      product: cartItem._id,
      color: cartItem.color,
      name: product.name,
      image: selectedColor.colorImage,
    };
  });

  const products = await Promise.all(getCartProductPromises);
  let cartTotal = 0;
  for (let i = 0; i < products.length; i++) {
    cartTotal += products[i].price * products[i].quantity;
  }

  const newCart = await new Cart({
    products,
    cartTotal,
    orderby: user.id,
  }).save();

  // await newCart.populate('orderby', 'name -_id');

  res.status(200).json({
    status: 'success',
    data: newCart,
  });
});

exports.getUserCart = asyncHandler(async (req, res, next) => {
  const cart = await Cart.findOne({ orderby: req.user.id }).populate(
    'products.product',
    'name description tag',
  );
  console.log(cart);
  if (!cart) return next(new AppError('No cart Found', 404));
  res.status(200).json({
    status: 'success',
    data: cart,
  });
});

exports.emptyCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOneAndDelete({ orderby: req.user.id });
  console.log(cart);
  res.status(200).json({
    status: 'success',
  });
});

exports.getAddress = factory.getAll(Address);
exports.deleteAddress = factory.deleteOne(Address);
