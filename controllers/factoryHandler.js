const asyncHandler = require('express-async-handler');

const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

exports.getAll = (Model, projection) =>
  asyncHandler(async (req, res, next) => {
    let filter = {};

    if (req.params.userId) filter = { user: req.params.userId };

    // if (req.query.filter) filter = APIFeatures(Model, req.query.filter).filter();
    const features = new APIFeatures(Model.find(filter, projection), req.query)
      .filter()
      .sort()
      .limitingFields()
      .pagination();

    // const data = await features.query.explain();
    const data = await features.query;
    if(!data || data.length === 0) return next(new AppError(`no record(s) found`))

    if (req.stat && req.stat > 0) {
      data.forEach((item, i) => {
        console.log('hello');
        if (req.stat && req.stat[i]) {
          // Check if req.stat[i] exists
          if (req.stat[i].ratingsAverage && req.stat[i].ratingsQuantity) {
            // If ratingsAverage and ratingsQuantity are defined in req.stat[i], update the item
            item.ratingsAverage = req.stat[i].ratingsAverage.toFixed(1);
            item.ratingsQuantity = req.stat[i].ratingsQuantity;
          } else {
            // If ratingsAverage or ratingsQuantity are not defined in req.stat[i], set default values
            item.ratingsAverage = 4.5;
            item.ratingsQuantity = 2;
          }
        } else {
          // If req.stat[i] doesn't exist, set default values
          item.ratingsAverage = 4.5;
          item.ratingsQuantity = 2;
        }
      });
    }

    res.status(200).json({
      status: 'success',
      results: data.length,
      data: {
        data,
      },
    });
  });

  exports.getOne = (Model, populateOpt = null) =>
    asyncHandler(async (req, res, next) => {
      const query = Model.findById(req.params.id);
      
      if (populateOpt) query.populate(populateOpt);
  
      const data = await query;
  
      if (!data) return next(new AppError('No document with id found!', 404));
  
      // Assuming calculateReviewStats is defined elsewhere
      if (data.reviews) {
        const reviewStats = calculateReviewStats(data.reviews);
        data.reviewStat = reviewStats;
      }
  
      if (req.stat) {
        data.ratingsQuantity = req.stat[0].ratingsQuantity || 0;
        data.ratingsAverage = req.stat[0].ratingsAverage.toFixed(0) || '0';
      }
  
      req.data = data;
  
      res.status(200).json({
        status: 'success',
        data: {
          data,
        },
      });
    });
  

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const data = await Model.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        data,
      },
    });
  });

exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    let data

    if(req.params.colorId){
      data = await Model.findByIdAndUpdate(
        req.params.id,
        {
          $set: {
            "color.$[elem].color": req.body.color,
            "color.$[elem].quantity": req.body.quantity,
            "color.$[elem].discountPrice": req.body.discountPrice,
          }
        },
        {
          arrayFilters: [{ "elem._id": req.params.colorId }],
          new: true,
          runValidators: true
        }
      );
    } else{
      data = await Model.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });
    }

    

    if (!data) return next(new AppError('No document found with Id', 404));

    res.status(200).json({
      status: 'success',
      data: {
        data,
      },
    });
  });

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) return next(new AppError('No document with id found', 404));

    res.status(204).json({
      status: 'success',
      data: null,
    });
  });

// Function to calculate review statistics
function calculateReviewStats(reviews) {
  const reviewStats = {
    star1: 0,
    star2: 0,
    star3: 0,
    star4: 0,
    star5: 0,
  };

  if(reviews){
    // Iterate through reviews and count ratings for each star
    reviews.forEach((review) => {
      if (review.rating === 1) {
        reviewStats.star1++;
      } else if (review.rating === 2) {
        reviewStats.star2++;
      } else if (review.rating === 3) {
        reviewStats.star3++;
      } else if (review.rating === 4) {
        reviewStats.star4++;
      } else if (review.rating === 5) {
        reviewStats.star5++;
      }
    });
  
    return reviewStats;
  }
}

