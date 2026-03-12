const { body } = require("express-validator");
// const fs = require("fs/promises"); // async fs — no more blocking unlinkSync
// const path = require("path");
const User = require("../models/User");
const { successResponse, errorResponse } = require("../utils/response");
const asyncHandler = require("../utils/asyncHandler");

// ─── Validation Rules ──────────────────────────────────────────────────────

exports.updateProfileValidation = [
  body("name").optional().trim().notEmpty().withMessage("Name cannot be empty").isLength({ max: 100 }),
  body("dob").optional({ nullable: true }).isISO8601().withMessage("Invalid date format (use YYYY-MM-DD)"),
  body("address").optional().trim().isLength({ max: 300 }),
  body("goal").optional().trim().isLength({ max: 500 }),
  body("why").optional().trim().isLength({ max: 500 }),
];

// ─── Helper ────────────────────────────────────────────────────────────────

// const deleteLocalAvatar = async (avatarPath) => {
//   if (avatarPath && avatarPath.startsWith("uploads/")) {
//     try {
//       await fs.unlink(path.join(__dirname, "..", avatarPath));
//     } catch {
//       // File may already be gone — not a fatal error
//     }
//   }
// };

// ─── Controllers ───────────────────────────────────────────────────────────

// @route   GET /api/profile
exports.getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).lean();
  return successResponse(res, 200, "Profile fetched", { user });
});

// @route   PUT /api/profile
exports.updateProfile = asyncHandler(async (req, res) => {
  const ALLOWED = ["name", "dob", "address", "goal", "why"];
  const updates = {};
  ALLOWED.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = field === "dob" ? (req.body[field] || null) : req.body[field];
    }
  });

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updates },
    { new: true, runValidators: true }
  ).lean();

  return successResponse(res, 200, "Profile updated successfully!", { user });
});


// @route   PUT /api/profile/avatar
exports.uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    return errorResponse(res, 400, "No image file uploaded.");
  }

  const user = await User.findById(req.user._id).select("avatar");

  const avatarUrl = req.file.path; // URL from Cloudinary
  user.avatar = avatarUrl;
  await user.save();

  return successResponse(res, 200, "Avatar uploaded successfully!", {
    avatar: avatarUrl,
    user,
  });
});

// @route   DELETE /api/profile/avatar
exports.removeAvatar = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("avatar");

  user.avatar = "";
  await user.save();

  return successResponse(res, 200, "Avatar removed successfully.", { user });
});



// @route   PUT /api/profile/avatar
// exports.uploadAvatar = asyncHandler(async (req, res) => {
//   if (!req.file) {
//     return errorResponse(res, 400, "No image file uploaded.");
//   }

//   const user = await User.findById(req.user._id).select("avatar");
//   const oldAvatar = user.avatar;

//   const avatarPath = req.file.path.replace(/\\/g, "/");
//   user.avatar = avatarPath;
//   await user.save();

//   // Delete old avatar after saving new one (non-blocking)
//   deleteLocalAvatar(oldAvatar).catch(() => {});

//   return successResponse(res, 200, "Avatar uploaded successfully!", {
//     avatar: avatarPath,
//     user,
//   });
// });

// // @route   DELETE /api/profile/avatar
// exports.removeAvatar = asyncHandler(async (req, res) => {
//   const user = await User.findById(req.user._id).select("avatar");
//   const oldAvatar = user.avatar;

//   user.avatar = "";
//   await user.save();

//   deleteLocalAvatar(oldAvatar).catch(() => {});

//   return successResponse(res, 200, "Avatar removed successfully.", { user });
// });

// @route   PUT /api/profile/change-password
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return errorResponse(res, 400, "Current and new passwords are required.");
  }
  if (newPassword.length < 8) {
    return errorResponse(res, 400, "New password must be at least 8 characters.");
  }
  if (currentPassword === newPassword) {
    return errorResponse(res, 400, "New password must be different from the current password.");
  }

  const user = await User.findById(req.user._id).select("+password");
  if (!(await user.matchPassword(currentPassword))) {
    return errorResponse(res, 400, "Current password is incorrect.");
  }

  user.password = newPassword;
  await user.save();

  return successResponse(res, 200, "Password changed successfully.");
});
