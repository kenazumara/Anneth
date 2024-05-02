const catchAsync = require('../utils/catchAsync');
const Category = require('../models/categoryModel');
const factory = require('./factoryHandler');

exports.getAllCategory = factory.getAll(Category);
