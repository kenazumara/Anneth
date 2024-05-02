const express = require('express');
const categoryController = require('../controllers/categoryControler');
const authController = require('../controllers/authController');

const router = express.Router();

router
  .route('/')
  .get(
    authController.protect,
    authController.restrictTo('admin'),
    categoryController.getAllCategory
  );

module.exports = router;
