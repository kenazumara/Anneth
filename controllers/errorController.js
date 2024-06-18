// DEVELOPMENT ERRORS
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  // HANDLES ALL APP GENERATED ERRORS

  // if (err instanceof AppError) {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });

    // HANDLE CAST ERROR
  } else if (err.name === 'CastError') {
    res.status(400).json({
      status: err.status,
      message: `invalid ${err.path}: ${err.value} please check again`,
    });

    // HANDLE DUPLICATE FIELDS ERROR
  } else if (err.code === 11000) {
    const value = err.message.match(/{([^}]*)}/)[1];
    res.status(400).json({
      status: err.status,
      message: `${value} already exist, please use another`,
    });

    // HADLE VALIDATION ERROR
  } else if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors)
      .map((el) => el.message)
      .join('. ');
    res.status(400).json({
      status: err.status,
      message: `Invalid input data. ${errors}`,
    });

    //HANDLES JsonWebTokenError ERRORS
  } else if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      status: err.status,
      message: 'Invalid signature. Please login again!',
    });

    // HANDLES TokenExpiredError ERRORS
  } else if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      status: err.status,
      message: 'Token expired. Please login again!',
    });
  } else {
    // PROGRAMMING OR OTHER UNKNOWN ERRORS: DON'T LEAK ERROR DETAILS TO CLIENT
    console.error('ERROR 🔥', err);

    // 2) send generic message TO CLIENT
    return res.status(500).json({
      status: 'error',
      message: 'Something went wrong!',
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    sendErrorProd(err, res);
  }
};
