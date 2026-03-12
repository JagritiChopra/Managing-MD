const { errorResponse } = require("../utils/response");

// Handle validation errors from express-validator
const validateRequest = (req, res, next) => {
  const { validationResult } = require("express-validator");
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, 400, "Validation failed", errors.array());
  }
  next();
};

// Global error handler
const globalErrorHandler = (err, req, res, next) => {
  console.error("Global Error:", err);

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return errorResponse(res, 409, `${field} already exists.`);
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return errorResponse(res, 400, messages.join(". "));
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === "CastError") {
    return errorResponse(res, 400, "Invalid ID format.");
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return errorResponse(res, 401, "Invalid token.");
  }
  if (err.name === "TokenExpiredError") {
    return errorResponse(res, 401, "Token expired. Please log in again.");
  }

  // Multer file size error
  if (err.code === "LIMIT_FILE_SIZE") {
    return errorResponse(res, 400, "File size too large. Max 2MB allowed.");
  }

  return errorResponse(res, err.statusCode || 500, err.message || "Internal Server Error");
};

// 404 handler
const notFoundHandler = (req, res) => {
  return errorResponse(res, 404, `Route ${req.originalUrl} not found.`);
};

module.exports = { validateRequest, globalErrorHandler, notFoundHandler };
