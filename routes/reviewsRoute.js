const express = require('express');
const reviewController = require('../controllers/reviewController');
const authController = require('../controllers/authController');

const router = express.Router({ mergeParams: true });

router.use(authController.protect);

router
  .route('/')
  .get(authController.restrictTo('admin'), reviewController.getAllReviews)
  .post(
    reviewController.setProductId,
    reviewController.createReview
  );

router
  .route('/:id')
  .get(reviewController.getOneReview)
  .delete( reviewController.deleteReview)
  .patch(reviewController.setProductId, reviewController.updateReview);

module.exports = router;
