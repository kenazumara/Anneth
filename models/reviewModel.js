const mongoose = require('mongoose');
const Product = require('./productModel');

const reviewSchema = mongoose.Schema({
  comment: {
    type: String,
    required: [true, 'A review must have a comment'],
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: [true, 'rating must be between 1 and 5'],
    set: (val) => Math.round(val * 10) / 10, // 4.6666 * 10 = 47 / 10 = 4.7
  },
  product: {
    type: mongoose.Schema.ObjectId,
    ref: 'Product',
    required: [true, 'A review must have a product'],
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'A review must have a user'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

reviewSchema.index({ product: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function (next) {
  this.populate({ path: 'user', select: '-_id firstName lastName photo' });

  next();
});

reviewSchema.statics.calcAverage = async function (productId) {
  const stat = await this.aggregate([
    {
      $match: { product: productId },
    },
    {
      $group: {
        _id: '$product',
        ratingsQuantity: { $sum: 1 },
        ratingsAverage: { $avg: '$rating' },
      },
    },
  ]);

  console.log(stat);

  if (stat.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      ratingsAverage: stat[0].ratingsAverage.toFixed(1),
      ratingsQuantity: stat[0].ratingsQuantity,
    });
  } else {
    await Product.findByIdAndUpdate(productId, {
      ratingsAverage: 4.5,
      ratingsQuantity: 0,
    });
  }
};

reviewSchema.post('save', function () {
  this.constructor.calcAverage(this.product);
});

reviewSchema.pre(/^findOneAnd/, function (next) {
  this.r = this.clone().find();
});

reviewSchema.post(/^findOneAnd/, function () {
  this.r.constructor.calcAverage(this.r.product);
});

////////////////////////////////////////////////

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
