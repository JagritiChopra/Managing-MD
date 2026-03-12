const { verifyToken } = require("../utils/generateToken");
const User = require("../models/User");
const { errorResponse } = require("../utils/response");

// Fields we actually need on req.user — avoids fetching the full document
const USER_FIELDS = "_id name email avatar";

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return errorResponse(res, 401, "Not authorized. Please log in.");
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyToken(token);

    // lean() returns a plain JS object — ~3× faster than a full Mongoose document
    // for read-only middleware that only needs user identity
    const user = await User.findById(decoded.id).select(USER_FIELDS).lean();
    if (!user) {
      return errorResponse(res, 401, "User no longer exists.");
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return errorResponse(res, 401, "Session expired. Please log in again.");
    }
    return errorResponse(res, 401, "Invalid token. Please log in.");
  }
};

module.exports = { protect };
