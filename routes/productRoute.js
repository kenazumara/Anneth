const express = require('express');
const productController = require('../controllers/productController');
const authController = require('../controllers/authController');
const colorController = require('../controllers/colorController');
const reviewRoute = require('./reviewsRoute');

const router = express.Router();

router.route('/').get(productController.getAllProducts);

router
  .route('/:id')
  .get(productController.getOneProduct)
  .patch(
    authController.protect,
    productController.productPhotoUpload,
    productController.updateProduct,
    productController.resizeProductImages,
  )
  .delete(authController.protect, productController.deleteProduct);

router.get('/:id/relatedProducts', productController.relatedProducts);

router.use(authController.protect);

router
  .route('/createProduct')
  .post(
    authController.restrictTo('admin'),
    productController.productPhotoUpload,
    productController.createProduct,
    productController.resizeProductImages,
  );

router
  .route('/:id/color')
  .post(
    authController.restrictTo('admin'),
    productController.productPhotoUpload,
    productController.createColor,
    productController.resizeProductImages,
  );

router
  .route('/:id/color/:colorId')
  .patch(
    authController.restrictTo('admin'),
    colorController.setParamsId,
    productController.productPhotoUpload,
    productController.updateProduct,
    productController.resizeProductImages,
  )
  .delete(
    authController.restrictTo('admin'),
    colorController.setParamsId,
    colorController.deleteColor,
  );

router.use('/:productId/review', reviewRoute);

module.exports = router;
