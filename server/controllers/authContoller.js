const crypto = require("crypto");
const User = require("../models/UserModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const sendEmail = require("../utils/email");
const jwt = require("jsonwebtoken");
const { promisify } = require("util");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN + "d",
  });
};

const createSendToken = (user, statuscode, req, res) => {
  const token = signToken(user._id);

  res.cookie("jwt", token, {
    maxAge: new Date(
      Date.now() + process.env.JWT_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),

    httpOnly: true,
    secure: req.secure || req.headers["x-forwarded-proto"] === "https",
  });

  user.password = undefined;

  res.status(statuscode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res) => {
  const { name, email, password, passwordConfirm } = req.body;

  const newUser = await User.create({ name, email, password, passwordConfirm });

  createSendToken(newUser, 201, req, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError("Please Provide email and password ! ", 400));
  }

  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect email or password ! ", 401));
  }

  createSendToken(user, 200, req, res);
});

exports.logout = (req, res) => {
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    status: "success",
  });
};

exports.protect = catchAsync(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.headers.cookie) {
    token = req.headers.cookie.split("=")[1];
  }

  if (!token) {
    return next(
      new AppError("You need to login ! Please log in to get access ", 401)
    );
  }

  // 2 . Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3 . Check if user still exist
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError("The user does not exist ", 401));
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1.Get User based on email
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError("There is no user with email address", 404));
  }

  // 2.Generate the random token
  const resetToken = await user.createPasswordResetToken();

  await user.save({ validateBeforeSave: false });

  // 3.Send it to user's email address
  const resetURL = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/resetPassword/${resetToken}`;
  console.log(resetURL);

  const message = `Forgot Password ? Submit a PATCH Request with new Password and confirm password to :${resetURL}.\nIf you did't forgot your password Please Ignore this email !`;

  try {
    await sendEmail({
      email: user.email,
      subject: "Your Password Reset Token (Valid Upto 10 Mins )",
      message,
    });

    res.status(200).json({ status: "success", message: "Token Sent to Mail" });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError("There was an Error sending the Email, Try again Later", 500)
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on token
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  // 2)If token has not expired, and there is user, set the new password

  if (!user) {
    return next(new AppError("Token is invalid or has expired", 400));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  // 3)Update changePasswordAt property for the user

  // 4)Log the user in,send JWT
  createSendToken(user, 200, req, res);
});
