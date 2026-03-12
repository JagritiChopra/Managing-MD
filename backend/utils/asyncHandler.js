/**
 * Wraps async route handlers to forward errors to Express's global error handler.
 * Eliminates repetitive try/catch blocks across all controllers.
 *
 * @param {Function} fn - Async express route handler
 * @returns {Function} Wrapped handler that catches and forwards errors
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
