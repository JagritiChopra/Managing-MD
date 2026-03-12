const express = require("express");
const router = express.Router();
const {
  getProfile,
  updateProfile,
  uploadAvatar,
  removeAvatar,
  changePassword,
  updateProfileValidation,
} = require("../controllers/profileController");
const { protect } = require("../middleware/auth");
const { validateRequest } = require("../middleware/errorHandler");
const upload = require("../middleware/upload");

// All profile routes are private
router.use(protect);

router.get("/", getProfile);
router.put("/", updateProfileValidation, validateRequest, updateProfile);
router.put("/avatar", upload.single("avatar"), uploadAvatar);
router.delete("/avatar", removeAvatar);
router.put("/change-password", changePassword);

module.exports = router;
