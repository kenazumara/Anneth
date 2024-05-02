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
    const data = await Model.findById(req.params.id).populate(populateOpt);

    if (!data) return next(new AppError('No document with id found!', 404));
    const reviewStats = calculateReviewStats(data.reviews);
    // Update product with reviewStats
    data.reviewStat = reviewStats;

    if (req.stat) {
      // Update data object with ratingsQuantity and ratingsAverage
      data.ratingsQuantity = req.stat[0].ratingsQuantity;
      data.ratingsAverage = req.stat[0].ratingsAverage.toFixed(0);
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
    // let fieldBody;
    // if (req.params.colorId) {
    //   console.log(req.params.colorId)
    //   fieldBody = req.body
    //   // fieldBody = { $pull: { color: { _id: req.params.colorId } }, body: req.body};
    // } else {
    //   fieldBody = req.body;
    // }
    let data

    if(req.params.colorId){
      data = await Model.findByIdAndUpdate(
        req.params.id,
        {
          $set: {
            "color.$[elem].color": req.body.color,
            "color.$[elem].quantity": req.body.quantity,
            "color.$[elem].discountPrice": req.body.discountPrice,
            // Add more fields as needed
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

// // FILTER OUT OTHER ELEMENTS FROM REQ.QUERY OBJECT
// const queryObj = { ...req.query };
// const excludeEl = ['sort', 'page', 'limit', 'fields'];
// excludeEl.forEach((el) => delete queryObj[el]);

// // ADDING '$' TO MONGO OPERATORS (FILTERING)
// let queryStr = JSON.stringify(queryObj);
// queryStr = queryStr.replace(/\b(gte|lt|lte)\b/g, (match) => `$${match}`);
// const queryObj1 = JSON.parse(queryStr);

// // LOOP THROUGH QUERY.OBJ TO CONVERT STRINGED-NUMBERS TO NUMBERS (FILTERING)
// Object.keys(queryObj1).forEach((key) => {
//   if (!isNaN(queryObj1[key])) {
//     queryObj1[key] = parseFloat(queryObj1[key]);
//   }
// });

// if (req.query) filter = queryObj1;

// let query = Model.find(filter, projection).APIFeatures;

// SORTING
//   if (req.query.sort) {
//     const sortBy = req.query.sort.split(',').join(' ');
//     query = query.sort(sortBy);
//   } else {
//     query.sort('-createdAt');
//   }

//   // LIMITING FIELDS
// if (req.query.fields) {
//   const fields = req.query.fields.split(',').join(' ');
//   query = query.select(fields);
// } else {
//   query = query.select('-__v');
// }

//   // PAGINATION
//   const page = req.query.page * 1 || 1;
//   const limit = req.query.limit * 1 || 10;
//   const skip = (page - 1) * limit;

//   if(req.query.page ) {
//     const docNumber = await Model.countDocuments()
//     if(skip > docNumber) {
//    throw new Error ('No page found')
//   }
//   console.log(docNumber)
// }
// query = query.skip(skip).limit(limit)
