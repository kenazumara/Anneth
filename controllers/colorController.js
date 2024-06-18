/* eslint-disable */

const multer = require('multer');
const sharp = require('sharp');

const catchAsync = require('../utils/catchAsync');
const Product = require('../models/productModel');
const Color = require('../models/colorModel');
const factory = require('./factoryHandler');
const AppError = require('../utils/appError');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image. Please upload an image', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.setParamsId = (req, res, next) => {
  if (!req.body.id) req.body.id = req.params.id;
  if (!req.body.colorId) req.body.colorId = req.params.colorId;

  next();
};

exports.updateProduct = factory.updateOne(Product);

exports.deleteColor = catchAsync(async (req, res, next) => {
  if (!req.params.colorId)
    return next(new AppError('Color with id not found', 404));

  const updatedColor = await Product.findByIdAndUpdate(
    req.params.id,
    { $pull: { color: { _id: req.params.colorId } } },
    { new: true, runValidators: true }
  );

  if (!updatedColor) {
    return next(new AppError('Product not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: updatedColor,
  });
});

exports.createColor = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  // Assuming req.body.colors is an array of colors
  const colors = req.body.color;

  // Iterate over each color in the colors array
  for (const colorData of colors) {
    const newColor = {
      color: colorData.color,
      quantity: colorData.quantity,
      discountPrice: colorData.discountPrice,
    };  

    // Create the color and add it to the product
    const color = await Color.create(newColor);
    product.color.push(color);
  }
  
  req.product = product;
  next();
});

exports.productColorUpload = upload.array('colorImage', 5);

exports.resizeProductColor = catchAsync(async (req, res, next) => {
  if (!req.files || !req.product.color) return next();

  await Promise.all(
    req.files.map(async (file, i) => {
      const filename = `product_${req.product.id}-${Date.now()}-${
        req.product.color[i].color
      }.jpeg`;
      req.product.color[i].colorImage = filename;

      await sharp(file.buffer)
        .resize(74, 74)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/product/74x74_${filename}`);
    })
  );

  await req.product.save();

  res.status(200).json({
    status: 'success',
    data: req.product,
  });
});
