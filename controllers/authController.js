const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const asyncHandler = require('express-async-handler');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const SendEmail = require('../utils/email');

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET);

const getToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOption = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true,
  };
  if (process.env.NODE_ENV === 'production') cookieOption.secure = true;

  res.cookie('jwt', token, cookieOption);

  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: user,
  });
};

exports.signUp = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  const findUser = await User.findOne({ email });

  if (!findUser) {
    const user = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      confirmPassword: req.body.confirmPassword,
      role: req.body.role,
    });

    // Exclude password field from user object
    const userWithoutPassword = { ...user.toObject() };
    delete userWithoutPassword.password;

    const url = `${req.protocol}://${req.get('host')}/api/v1/user/getUser`;

    await new SendEmail(user, url).sendWelcome();
    getToken(user, 201, res);
  } else {
    return next(new AppError('User already exists', 404));
  }
});

exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password)
    return next(new AppError('Please enter a valid email or password'));

  const user = await User.findOne({ email }).select('+password');

  if (
    user &&
    user.passwordChangedAt &&
    !(await user.correctPassword(req.body.password, user.password))
  ) {
    const currentTime = new Date().getTime();
    const timeDifferenceInMilliseconds = currentTime - user.passwordChangedAt;
    // const timeDifferenceInDays = `${Math.floor(
    //   timeDifferenceInMilliseconds / (1000 * 60 * 60 * 24),
    // )} days`;
    // const timeDifferenceInMinutes = `${Math.floor(timeDifferenceInMilliseconds / (1000 * 60))} minutes`;
    // const timeDifferenceInHours = `${Math.floor(timeDifferenceInMilliseconds / (1000 * 60 * 60))} hours`;
    // const timeDifferenceInMonths = `${Math.floor(timeDifferenceInMilliseconds / (1000 * 60 * 60 * 24 * 31))} months`;
    // return next(
    //   new AppError(
    //     `Password was changed ${timeDifferenceInMilliseconds < 3600000 ? timeDifferenceInMinutes : timeDifferenceInMilliseconds >= 3600000 && timeDifferenceInMilliseconds < 86400000 ? timeDifferenceInHours : timeDifferenceInMilliseconds >= 86400000 && timeDifferenceInMilliseconds < 2678400000 ? timeDifferenceInDays : timeDifferenceInMilliseconds >= 2678400000 ? timeDifferenceInMonths : timeDifferenceInMonths} ago. Please enter your new password`,
    //     401,
    //   ),
    // );

    let timeDifferenceFormatted;
    if (timeDifferenceInMilliseconds < 3600000) {
      timeDifferenceFormatted = `${Math.floor(timeDifferenceInMilliseconds / (1000 * 60))} minutes`;
    } else if (timeDifferenceInMilliseconds < 86400000) {
      timeDifferenceFormatted = `${Math.floor(timeDifferenceInMilliseconds / (1000 * 60 * 60))} hours`;
    } else if (timeDifferenceInMilliseconds < 2678400000) {
      timeDifferenceFormatted = `${Math.floor(timeDifferenceInMilliseconds / (1000 * 60 * 60 * 24))} days`;
    } else {
      timeDifferenceFormatted = `${Math.floor(timeDifferenceInMilliseconds / (1000 * 60 * 60 * 24 * 31))} months`;
    }

    return next(
      new AppError(
        `Password was changed ${timeDifferenceFormatted} ago. Please enter your new password`,
        401,
      ),
    );
  }

  if (
    !user ||
    !(await user.correctPassword(req.body.password, user.password))
  ) {
    return next(new AppError('Invalid email or password', 401));
  }

  getToken(user, 200, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    httpOnly: true,
    expires: new Date(Date.now() + 10 * 1000),
  });
  res.status(200).json({
    status: 'success',
    message: 'Successfully logged out',
  });
};

// exports.logout = (req, res) => {
//   res.clearCookie('jwt', '', {
//     httpOnly: true,
//   });
//   res.status(200).json({
//     status: 'success',
//     message: 'Successfully logged out',
//   });
// };

exports.protect = catchAsync(async (req, res, next) => {
  const authToken = req.headers.authorization;
  let token;

  // Getting the token and check if it exist
  if (authToken && authToken.startsWith('Bearer')) {
    token = authToken.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token)
    return next(new AppError('You are not logged in. Please log in', 401));

  const decoder = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  // 3) Check if user exit
  const currentUser = await User.findById(decoder.id);

  if (!currentUser)
    return next(
      new AppError('The token belonging to this user no longer exist', 401),
    );

  if (currentUser.passwordChangedAfter(decoder.iat)) {
    const { passwordChangedAt } = currentUser;
    const currentTime = new Date().getTime();
    const timeDifferenceInMilliseconds = passwordChangedAt - currentTime;
    const timeDifferenceInDays = Math.floor(
      timeDifferenceInMilliseconds / (1000 * 60 * 60 * 24),
    );
    return next(
      new AppError(
        `Password was changed ${timeDifferenceInDays} days ago. Please enter your new password`,
        401,
      ),
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
  next();
});

exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role))
      return next(
        new AppError("You don't have permission to perform this action", 404),
      );

    next();
  };

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // Get user based on email
  const user = await User.findOne({ email: req.body.email });

  if (!user) return next(new AppError('No user with email found', 401));

  // Generate random token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // Send reset token to user's email
  try {
    const resetUrl = `${req.protocol}://${req.get(
      'host',
    )}/api/v1/user/resetPassword/${resetToken}`;

    await new SendEmail(user, resetUrl).sendResetPassword();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'There was an error sending the email. Try again later',
        500,
      ),
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // const user = await User.findOne({ passwordResetToken: hashedToken });
  // const time = Date.now();
  // console.log(user);
  if (!user)
    return next(
      new AppError('Password reset token is invalid or has expired', 400),
    );

  user.password = req.body.password;
  user.confirmPassword = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  getToken(user, 201, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('+password');

  const validatePassword = await user.correctPassword(
    req.body.currentPassword,
    user.password,
  );

  if (!validatePassword) {
    return next(
      new AppError('Invalid password. Please enter a valid password', 401),
    );
  }

  user.password = req.body.password;
  user.confirmPassword = req.body.confirmPassword;
  await user.save();

  getToken(user, 201, res);
});
