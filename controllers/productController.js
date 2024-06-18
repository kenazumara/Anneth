/* eslint-disable */

const multer = require('multer');
const sharp = require('sharp');

const catchAsync = require('../utils/catchAsync');
const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const Review = require('../models/reviewModel');
const factory = require('./factoryHandler');
const AppError = require('../utils/appError');

exports.setParamsId = (req, res, next) => {
  if (!req.body.id) req.body.id = req.params.id;
  if (!req.body.colorId) req.body.colorId = req.params.colorId;

  next();
};

exports.relatedProducts = catchAsync(async (req, res, next) => {
  // req.params.id = req.params.id;
  // if(!req.product) return next(new AppError('Product not found'))
  const product = await Product.findById(req.params.id);
  const relatedProducts = await Product.find({ tag: product.tag });

  let [user1, user2, ...user3] = [
    { name: 'jhon', id: 1, email: 'heloo' },
    { name: 'jih', id: 1, email: 'heloo' },
    { name: 'jwes', id: 1, email: 'heloo' },
    { name: 'jwwwww', id: 1, email: 'heloo' },
  ];

  console.log(user2);

  res.status(200).json({
    status: 'success',
    results: relatedProducts.length,
    data: {
      products: relatedProducts,
    },
  });
});

exports.getAllProducts = factory.getAll(Product, { reviewStat: 0 });
exports.getOneProduct = factory.getOne(Product, { path: 'reviews' });
exports.updateProduct = factory.updateOne(Product);
exports.deleteProduct = factory.deleteOne(Product);

exports.createProduct = catchAsync(async (req, res, next) => {
  // Check if a category with the same name as the product's tag exists
  let category = await Category.findOne({ name: req.body.tag });

  // If the category doesn't exist, create a new one
  if (!category) {
    category = await Category.create({ name: req.body.tag });
  }

  req.body = { ...req.body, category: category._id, tag: category.name };

  const product = await Product.create(req.body);

  req.product = product;

  next();
});

exports.createColor = catchAsync(async (req, res, next) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!product) return next(new AppError('No product found with Id', 404));

  const colors = req.body.color;

  // Iterate over each color in the colors array
  for (const colorData of colors) {
    const newColor = {
      color: colorData.color,
      quantity: colorData.quantity,
      discountPrice: colorData.discountPrice,
    };
  }
  req.product = product;
  next();
});

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

exports.productPhotoUpload = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 9 },
  { name: 'colorImage', maxCount: 9 },
]);

exports.resizeProductImages = catchAsync(async (req, res, next) => {
  if (!req.files) return next();

  if (req.files.imageCover) {
    // 1) imageCover
    req.product.imageCover = `product_${
      req.product.id
    }-${Date.now()}-cover.jpeg`;

    const clonedBuffer = Buffer.from(req.files.imageCover[0].buffer);

    // Resize and save the 800x800 image
    await sharp(clonedBuffer)
      .resize(800, 800)
      .toFormat('jpeg')
      .jpeg({ quality: 90 })
      .toFile(`public/img/product/800x800_${req.product.imageCover}`);

    // Resize and save the 75x75 image
    await sharp(clonedBuffer) // Use the cloned buffer for resizing the second image
      .resize(250, 250)
      .toFormat('jpeg')
      .jpeg({ quality: 90 })
      .toFile(`public/img/product/250x250_${req.product.imageCover}`);
  }

  if (req.files.images) {
    // 2) images
    req.product.images = [`${req.product.imageCover}`];
    await Promise.all(
      req.files.images.map(async (file, i) => {
        const filename = `product_${req.product.id}-${Date.now()}-${i + 1}.jpeg`;

        await sharp(file.buffer)
          .resize(800, 800)
          .toFormat('jpeg')
          .jpeg({ quality: 90 })
          .toFile(`public/img/product/800x800_${filename}`);

        req.product.images.push(filename);
      }),
    );
  }

  if (req.files.colorImage) {
    // 3. colorImage
    await Promise.all(
      req.files.colorImage.map(async (file, i) => {
        const filename = `product_${req.product.id}-${Date.now()}-${
          req.product.color[i].color
        }.jpeg`;

        req.product.color[i].colorImage = filename;

        // Clone the image buffer
        const clonedBuffer = Buffer.from(file.buffer);

        // Resize and save the 800x800 image
        await sharp(clonedBuffer)
          .resize(800, 800)
          .toFormat('jpeg')
          .jpeg({ quality: 90 })
          .toFile(`public/img/product/800x800_${filename}`);

        // Resize and save the 75x75 image
        await sharp(clonedBuffer) // Use the cloned buffer for resizing the second image
          .resize(75, 75)
          .toFormat('jpeg')
          .jpeg({ quality: 90 })
          .toFile(`public/img/product/75x75_${filename}`);
      }),
    );
  }

  await req.product.save();

  res.status(200).json({
    status: 'success',
    data: req.product,
  });
});

exports.getProductStat = catchAsync(async (req, res, next) => {
  const stats = await Review.aggregate([
    {
      $group: {
        _id: '$product', // Group by product
        ratingsQuantity: { $sum: 1 }, // Count reviews for each product
        ratingsAverage: { $avg: '$rating' }, // Calculate average rating for each product
      },
    },
    {
      $lookup: {
        from: 'products', // Assuming your Product model is named 'Product'
        localField: '_id',
        foreignField: '_id',
        as: 'product',
      },
    },
    {
      $unwind: '$product', // Convert product array to object
    },
    {
      $project: {
        _id: '$product._id',
        ratingsQuantity: 1,
        ratingsAverage: 1,
      },
    },
  ]);

  req.stat = stats;

  next();
});
