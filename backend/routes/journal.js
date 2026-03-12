const express = require("express");
const router = express.Router();
const {
  createEntry,
  getEntries,
  getEntry,
  updateEntry,
  deleteEntry,
  journalValidation,
} = require("../controllers/journalController");
const { protect } = require("../middleware/auth");
const { validateRequest } = require("../middleware/errorHandler");

router.use(protect);

router.post("/", journalValidation, validateRequest, createEntry);
router.get("/", getEntries);
router.get("/:id", getEntry);
router.put("/:id", journalValidation, validateRequest, updateEntry);
router.delete("/:id", deleteEntry);

module.exports = router;
