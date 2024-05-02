const express = require('express');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const xss = require('xss-clean');
const mongoSanitizer = require('express-mongo-sanitize');
const hpp = require('hpp')
const cors = require('cors')
const cookieParser = require('cookie-parser')

const productRouter = require('./routes/productRoute');
const categoryRouter = require('./routes/categoryRoute');
const reviewRouter = require('./routes/reviewsRoute');
const userRouter = require('./routes/userRoute');
const orderRouter = require('./routes/orderRoute');
const globalErrorHandler = require('./controllers/errorController');
const AppError = require('./utils/appError')

const app = express();

app.use(helmet())
app.use(cors())

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
}

// GLOBAL MIDDLEWARES
// Serving static files
app.use(express.static(path.join(__dirname, 'public')))

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
  console.log('development environment');
}

app.use(express.json({ limit: '10kb' }));

app.use(cookieParser())

app.use(mongoSanitizer())
app.use(xss())
app.use(hpp({
  whiteList: ['']
}))

// const ratelimter = rateLimit({
//   windowMs: 60 * 60 * 1000, // 60mins minutes
//   max: 100, // limit each IP to 100 requests per windowMs
//   message: 'Too many requests from this IP, please try again after an hour',
// })

// app.use('/api/v1/products', ratelimter);

//ROUTES
// A simple way to render pug file
app.get('/', (req, res) => {
  res.status(200).render('baseEmail')
})

app.use('/api/v1/products', productRouter);
app.use('/api/v1/category', categoryRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/user', userRouter);
app.use('/api/v1/order', orderRouter);


// Handles routes errors not found on the server
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

// Global app error handler
app.use(globalErrorHandler);

module.exports = app;
