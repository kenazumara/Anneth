const express = require('express');

const authController = require('../controllers/authController');
const cartController = require('../controllers/cartController');

const router = express.Router();


router
  .route('/checkout-session')
  .post(authController.protect, cartController.checkoutSession, cartController.qtySold );

router.route('/').get(authController.protect, cartController.allOrders)

router.post('/webhooks/stripe', authController.protect, cartController.webhooks);

module.exports = router;
