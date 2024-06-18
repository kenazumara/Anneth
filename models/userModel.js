const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const validator = require('validator');

const userSchema = mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'first name is required'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
    },
    gender: {
      type: String,
      // required: [true, 'Gender is required (Male or Female)'],
      // enum: ['male', 'female'],
    },
    email: {
      type: String,
      required: [true, 'Please enter a valid email address'],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, 'Please enter a valid email address'],
    },
    phone: {
      type: Number,
      required: [true, 'Please enter your phone number'],
      unique: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      trim: true,
      minLength: 8,
      select: false,
    },
    confirmPassword: {
      type: String,
      required: [true, 'Password confirm is required'],
      trim: true,
      validate: {
        // works only on create() nd save()
        validator: function (val) {
          return val === this.password;
        },
        message: 'Passwords do not match',
      },
    },
    currentPassword: String,
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    photo: {
      type: String,
      default: 'default.jpeg',
    },
    active: {
      type: Boolean,
      default: true,
      select: false,
    },
    reviews: {
      type: mongoose.Schema.ObjectId,
      ref: 'Review',
    },
    product: {
      type: mongoose.Schema.ObjectId,
      ref: 'Product',
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

userSchema.virtual('addresses', {
  ref: 'Address',
  localField: '_id',
  foreignField: 'user',
});

// Encrypting the password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);

  //Delete confirmPassword from database
  this.confirmPassword = undefined;
  next();
});

// For comparing password login and that in the database
userSchema.methods.correctPassword = async function (
  loginPassword,
  databasePassword,
) {
  return await bcrypt.compare(loginPassword, databasePassword);
};

// To set this.passwordChangedAt when password is changed
userSchema.pre('save', function (next) {
  // If password has not been changed
  if (!this.isModified('password') || this.isNew) return next();

  // If password has been changed
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// Delete user
userSchema.pre(/^find/, function (next) {
  this.find({ active: true });

  next();
});

// To check if password has been changed
userSchema.methods.passwordChangedAfter = function (JWTTimeStamp) {
  if (this.passwordChangedAt) {
    const changedPassword = parseInt(this.passwordChangedAt / 1000, 10);

    // If this returns true, it means password has been changed
    if (changedPassword !== undefined && changedPassword !== null) {
      return JWTTimeStamp < changedPassword;
    }
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  // Generate randomw token to sent to user email
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Encrypt the random token to save on database
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
