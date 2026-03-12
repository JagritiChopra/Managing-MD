const express = require("express");
const router = express.Router();
const {
  logSession,
  getSessions,
  getSessionReport,
  getSession,
  updateSession,
  deleteSession,
  sessionValidation,
} = require("../controllers/timerController");
const { protect } = require("../middleware/auth");
const { validateRequest } = require("../middleware/errorHandler");

router.use(protect);

router.post("/sessions", sessionValidation, validateRequest, logSession);
router.get("/sessions", getSessions);
router.get("/sessions/report", getSessionReport);
router.get("/sessions/:id", getSession);
router.put("/sessions/:id", sessionValidation, validateRequest, updateSession);
router.delete("/sessions/:id", deleteSession);

module.exports = router;
