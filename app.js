const express = require('express');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const cors = require('cors');
const AWS = require('aws-sdk');

const cookieParser = require('cookie-parser');
const compression = require('compression');
const productRouter = require('./routes/productRoute');
const categoryRouter = require('./routes/categoryRoute');
const reviewRouter = require('./routes/reviewsRoute');
const userRouter = require('./routes/userRoute');
const orderRouter = require('./routes/orderRoute');
const globalErrorHandler = require('./controllers/errorController');
const AppError = require('./utils/appError');


const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const app = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: 'http://localhost:4200', // Replace with your frontend URL
    credentials: true,
  }),
);

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Static files
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
}
app.use(express.static(path.join(__dirname, 'public')));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
  console.log('development environment');
}

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(
  hpp({
    whiteList: [''],
  })
);

app.use(compression())

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 60 mins
  max: 100, // Limit each IP to 100 requests per `window` (here, per hour)
  message: 'Too many requests from this IP, please try again after an hour',
});
app.use('/api', limiter);


// Routes
// app.get('/', (req, res) => {
//   res.status(200).render('baseEmail');
// });

// app.get('/image/:key', (req, res) => {
//   const {key} = req.params;
//   console.log(`Fetching URL for key: ${key}`);
// console.log('heeee🔥')
//   const url = s3.getSignedUrl('getObject', {
//     Bucket: 'anneth',
//     Key: key,
//     Expires: 60 * 20, // 5 minutes
//   });
//   res.json({ url });
// });


app.get('/image/:key', (req, res) => {
  const { key } = req.params;
  console.log(`Fetching URL for key: ${key}`);

  const params = {
    Bucket: 'anneth', // Replace with your actual S3 bucket name
    Key: key,
    Expires: 60 * 20, // URL expires in 20 minutes
  };

  s3.getSignedUrl('getObject', params, (err, url) => {
    if (err) {
      console.error('Error generating signed URL:', err);
      res.status(500).json({ error: 'Error generating signed URL' });
    } else {
      console.log('Generated URL:', url);
      res.json({ url });
    }
  });
});


app.use('/api/v1/products', productRouter);
app.use('/api/v1/category', categoryRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/user', userRouter);
app.use('/api/v1/order', orderRouter);

// Handle undefined routes
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

// Global error handling middleware
app.use(globalErrorHandler);

module.exports = app;
