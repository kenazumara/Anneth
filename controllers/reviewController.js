const factory = require('./factoryHandler')
const Review = require('../models/reviewModel')

exports.setProductId = (req, res, next) => {
  // this allows the user to manually pass in thses fields but when not provided, we generate it from the user info
  if (!req.body.product) req.body.product = req.params.productId;
  if(!req.body.user) req.body.user = req.user.id
  if(!req.body.cart) req.body.cart = req.params.cartId
  
    next()
  }

exports.getAllReviews = factory.getAll(Review)
exports.getOneReview = factory.getOne(Review)
exports.createReview = factory.createOne(Review)
exports.deleteReview = factory.deleteOne(Review)
exports.updateReview = factory.updateOne(Review)