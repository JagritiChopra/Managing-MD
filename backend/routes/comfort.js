const express = require("express");
const router = express.Router();
const {
  getAllComforts,
  getDefaultComforts,
  getUserComforts,
  addComfort,
  updateComfort,
  deleteComfort,
  comfortValidation,
} = require("../controllers/comfortController");
const { protect } = require("../middleware/auth");
const { validateRequest } = require("../middleware/errorHandler");

router.use(protect);

router.get("/", getAllComforts);
router.get("/default", getDefaultComforts);
router.get("/my", getUserComforts);
router.post("/", comfortValidation, validateRequest, addComfort);
router.put("/:id", comfortValidation, validateRequest, updateComfort);
router.delete("/:id", deleteComfort);

module.exports = router;
