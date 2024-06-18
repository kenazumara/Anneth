const express = require('express');
const reviewRouter = require('./reviewsRoute');

const authController = require('../controllers/authController');
const userController = require('../controllers/userController');

const router = express.Router();

router.post('/signup', authController.signUp);
router.post('/login', authController.login);
router.post('/logout', authController.logout);

router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

router.use(authController.protect);

router.route('/').get(userController.getAllUsers);

router.get('/getMe', userController.getme, userController.getUser);
router.patch('/updateUser', userController.getme, userController.updateUser);

router.delete('/deleteUser', userController.deleteUser);

router.patch(
  '/updateMe',
  userController.getme,
  userController.userPhotoUpload,
  userController.resizeUserPhoto,
  userController.updateMe,
);

router.delete(
  '/removeUser/:id',
  authController.restrictTo('admin'),
  userController.removeUser,
);

router.patch(
  '/updatePassword',
  authController.protect,
  authController.updatePassword,
);

router
  .route('/address')
  .post(authController.protect, userController.createAddress);

router
  .route('/:userId/address')
  .get(authController.protect, userController.getAddress);

router.delete(
  '/address/:id',
  authController.protect,
  userController.deleteAddress,
);

router.post(
  '/create-cart',
  // authController.protect,
  userController.addCart,
);
router.put(
  '/update-cart',
  // authController.protect,
  userController.updateCart,
);

router.put(
  '/get-cart',
  // authController.protect,
  userController.getUserCart,
);
router.delete('/empty-cart', authController.protect, userController.emptyCart);

router.use('/:userId/reviews', reviewRouter);

module.exports = router;
