const express = require("express");
const router = express.Router();
const {
  signup,
  login,
  forgotPassword,
  resetPassword,
  getMe,
  signupValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  verifyEmail ,
  resendVerificationValidation ,
  resendVerification
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");
const { validateRequest } = require("../middleware/errorHandler");

// Public routes
router.post("/signup", signupValidation, validateRequest, signup);
router.post("/login", loginValidation, validateRequest, login);
router.post("/forgot-password", forgotPasswordValidation, validateRequest, forgotPassword);
router.post("/reset-password/:token", resetPasswordValidation, validateRequest, resetPassword);
router.get("/verify-email/:token", verifyEmail);
router.post( "/resend-verification", resendVerificationValidation, resendVerification );

// Private routes
router.get("/me", protect, getMe);

module.exports = router;
