const mongoose = require('mongoose');
const slugify = require('slugify');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A product must have a name'],
      unique: true,
    },
    description: {
      type: String,
      required: [true, 'A product must have a description'],
    },

    highPrice: {
      type: Number,
      required: [true, 'A product must have a high price'],
    },
    lowPrice: {
      type: Number,
      required: [true, 'A product must have a low price'],
    },
    discountedHighPrice: {
      type: Number,
      required: [true, 'A product must have a discountedHighPrice'],
      // validate: {
      //   validator: function (val) {
      //     // the this keyword only points to the current document on NEW document creation
      //     return val < this.highPrice;
      //   },
      //   message: 'discountedHighprice ({VALUE}) should be below highPrice',
      // },
    },
    discountedLowPrice: {
      type: Number,
      required: [true, 'A product must have a discountedLowPrice'],
      // validate: {
      //   validator: function (val) {
      //     return val < this.highPrice;
      //   },
      //   message: 'discountedLowprice ({VALUE}) should be below lowPrice',
      // },
    },
    priceDiscountPercent: {
      type: Number,
      default: 0,
    },
    specification: {
      type: {
        model: String,
        material: String,
        shipping: Boolean,
      },
      default: {},
    },
    sold: {
      type: Number,
      default: 0,
    },
    tag: {
      type: String,
      required: [true, 'A product must have a tag'],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Catogory',
      // required: [true, 'A product must have a category'],
    },
    shipping: Boolean,
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below or equal to 5.0'],
      set: (val) => Math.round(val * 10) / 10, // 4.6666 * 10 = 47 / 10 = 4.7
    },
    reviewStat: {
      star1: { type: Number, default: 0 },
      star2: { type: Number, default: 0 },
      star3: { type: Number, default: 0 },
      star4: { type: Number, default: 0 },
      star5: { type: Number, default: 0 },
    },
    imageCover: {
      type: String,
    },
    images: [String],
    color: [
      {
        color: {
          type: String,
        },
        quantity: {
          type: Number,
          // required: [true, 'A product must have a quantity'],
        },
        discountPrice: {
          type: Number,
          // validate: {
          //   validator: function (val) {
          //     // the this keyword only points to the current document on NEW document creation
          //     return val < this.highPrice;
          //   },
          //   message: 'discountprice ({VALUE}) should be below price',
          // },
          // required: [true, 'A product must have a discountPrice'],
        },
        price: {
          type: Number,
          // required: [true, 'A product must have a discountPrice'],
        },
        colorImage: {
          type: String,
          // required: [true, 'A product must have a colorImage'],
        },
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
      select: false,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
      select: false,
    },
    slug: String,
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// productSchema.virtual('priceDiscountPercent').get(function () {
//   return (
//     ((this.highPrice - this.discountedHighPrice) / this.highPrice).toFixed(1) *
//     100
//   );
// });

// productSchema.index({ratingsAverage: 1})
productSchema.index({ price: 1, ratingsAverage: 1 });

productSchema.virtual('quantity').get(function () {
  // Calculate total quantity based on color variants
  if (this.color) {
    let totalQuantity = 0;
    this.color.forEach((item) => {
      totalQuantity += item.quantity;
    });
    return totalQuantity; // Return the calculated total quantity
  }
});

productSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'product',
});

// DOCUMENT MIDDLEWARE
productSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

productSchema.pre('save', function (next) {
  const discountPercentage =
    ((this.highPrice - this.discountedHighPrice) / this.highPrice) * 100;
  this.priceDiscountPercent = discountPercentage.toFixed(); // Assign the calculated discount percentage to the field
  next();
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
