const crypto = require("crypto");
const { body } = require("express-validator");
const User = require("../models/User");
const { generateToken } = require("../utils/generateToken");
const { sendEmail, getResetPasswordEmail } = require("../utils/sendEmail");
const { successResponse, errorResponse } = require("../utils/response");
const asyncHandler = require("../utils/asyncHandler");

// ─── Validation Rules ──────────────────────────────────────────────────────

exports.signupValidation = [
  body("name").trim().notEmpty().withMessage("Name is required").isLength({ max: 100 }),
  body("email").trim().isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/[A-Z]/).withMessage("Password must contain at least one uppercase letter")
    .matches(/[0-9]/).withMessage("Password must contain at least one number"),
];

exports.loginValidation = [
  body("email").trim().isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

exports.forgotPasswordValidation = [
  body("email").trim().isEmail().withMessage("Valid email is required").normalizeEmail(),
];

exports.resetPasswordValidation = [
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
];

exports.resendVerificationValidation = [
  body("email").trim().isEmail().withMessage("Valid email is required").normalizeEmail(),
];


// ─── Shared user projection for auth responses ─────────────────────────────
const AUTH_USER_FIELDS = "_id name email avatar createdAt";

// ─── Controllers ───────────────────────────────────────────────────────────

// @route   POST /api/auth/signup
exports.signup = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existingUser = await User.findOne({ email }).select("_id").lean();
  if (existingUser) {
    return errorResponse(res, 409, "An account with this email already exists.");
  }

  const user = await User.create({ name, email, password });

  // Generate email verification token
  const verificationToken = crypto.randomBytes(32).toString("hex");

  user.emailVerificationToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  user.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000;

  await user.save({ validateBeforeSave: false });



//  const token = generateToken(user._id);
  const verifyURL = `${process.env.CLIENT_URL}/api/auth/verify-email/${verificationToken}`;

  await sendEmail({
    to: user.email,
    subject: "Verify your Daydream account",
    html: `
    <h2>Hello ${user.name}</h2>
    <p>Please verify your email by clicking the link below:</p>
    <a href="${verifyURL}">${verifyURL}</a>
    <p>This link expires in 24 hours.</p>
  `,
  });
  // return successResponse(res, 201, "Account created successfully!", {
  //   token,
  //   user: {
  //     _id: user._id,
  //     name: user.name,
  //     email: user.email,
  //     avatar: user.avatar,
  //     createdAt: user.createdAt,
  //   },
  // });
  return successResponse(res, 201, "Account created! Please verify your email.", {
  user: {
    _id: user._id,
    name: user.name,
    email: user.email
  }
});
});

// @route GET /api/auth/verify-email/:token
exports.verifyEmail = asyncHandler(async (req, res) => {

  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpire: { $gt: Date.now() },
  });

  if (!user) {
    return errorResponse(res, 400, "Verification link invalid or expired.");
  }

  user.isVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpire = undefined;

  await user.save();

  return successResponse(res, 200, "Email verified successfully. You can now log in.");
});

// @route POST /api/auth/resend-verification
exports.resendVerification = asyncHandler(async (req, res) => {

  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return errorResponse(res, 404, "User not found.");
  }

  if (user.isVerified) {
    return errorResponse(res, 400, "Email is already verified.");
  }

  // generate new token
  const verificationToken = crypto.randomBytes(32).toString("hex");

  user.emailVerificationToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  user.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000;

  await user.save({ validateBeforeSave: false });

  const verifyURL = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;

  try {
    await sendEmail({
      to: user.email,
      subject: "Verify your Daydream account",
      html: `
        <h2>Hello ${user.name}</h2>
        <p>Please verify your email by clicking the link below:</p>
        <a href="${verifyURL}">${verifyURL}</a>
        <p>This link expires in 24 hours.</p>
      `,
    });

    return successResponse(res, 200, "Verification email resent successfully.");
  } catch (err) {
    console.error("Email send error:", err.message);
    return errorResponse(res, 500, "Email could not be sent.");
  }
});


// @route   POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.matchPassword(password))) {
    return errorResponse(res, 401, "Invalid email or password.");
  }
  if (!user.isVerified) {
    return errorResponse(res, 403, "Please verify your email first.");
  }
  const token = generateToken(user._id);

  return successResponse(res, 200, "Logged in successfully!", {
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      dob: user.dob,
      address: user.address,
      goal: user.goal,
      why: user.why,
    },
  });
});

// @route   POST /api/auth/forgot-password
exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  // Generic response — don't reveal whether the email exists
  if (!user) {
    return successResponse(res, 200, "If that email is registered, a reset link has been sent.");
  }

  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  try {
    await sendEmail({
      to: user.email,
      subject: "Daydream — Password Reset Request",
      html: getResetPasswordEmail(user.name, `${process.env.CLIENT_URL}/reset-password/${resetToken}`),
    });
  } catch (emailError) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    console.error("Email send error:", emailError.message);
    return errorResponse(res, 500, "Email could not be sent. Please try again.");
  }

  return successResponse(res, 200, "Password reset email sent successfully.");
});

// @route   POST /api/auth/reset-password/:token
exports.resetPassword = asyncHandler(async (req, res) => {
  const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  }).select("+resetPasswordToken +resetPasswordExpire");

  if (!user) {
    return errorResponse(res, 400, "Reset link is invalid or has expired.");
  }

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  return successResponse(res, 200, "Password reset successfully. Please log in.");
});

// @route   GET /api/auth/me
exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).lean();
  return successResponse(res, 200, "User fetched", { user });
});
