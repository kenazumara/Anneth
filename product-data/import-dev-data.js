const dotenv = require('dotenv');
const mongoose = require('mongoose');
const fs = require('fs');

const Product = require('../models/productModel');
const User = require('../models/userModel');
const Review = require('../models/reviewModel');
const Category = require('../models/categoryModel');

dotenv.config({ path: './config.env' });

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);

mongoose.connect(DB).then(() => console.log('DB connected successfully'));

// Read data to DB
const importdata = async () => {
  try {
    const products = JSON.parse(
      fs.readFileSync(`${__dirname}/product.json`, 'utf-8'),
    );
    const category = JSON.parse(
      fs.readFileSync(`${__dirname}/category.json`, 'utf-8'),
    );
    
    await Product.create(products);
    // await Category.create(category);
   
    console.log('Data successfully uploaded!');
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

// Delete all data from database
const deleteData = async () => {
  try {
    await Product.deleteMany();
    // await Category.deleteMany();
    // await User.deleteMany();
    // await Review.deleteMany();
    
    console.log('Data successfully deleted!');
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

if (process.argv[2] === '--import') {
  importdata();
} else if (process.argv[2] === '--delete') {
  deleteData();
}

console.log(process.argv);
