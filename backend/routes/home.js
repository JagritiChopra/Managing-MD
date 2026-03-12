const express = require("express");
const router = express.Router();
const {
  getRandomQuote,
  getAllQuotes,
  getDefaultTasks,
  updateDefaultTaskStatus,
  getUserTasks,
  createUserTask,
  updateUserTask,
  updateUserTaskStatus,
  deleteUserTask,
  userTaskValidation,
  statusValidation,
} = require("../controllers/homeController");
const { protect } = require("../middleware/auth");
const { validateRequest } = require("../middleware/errorHandler");

router.use(protect);

// Quotes
router.get("/quote", getRandomQuote);
router.get("/quotes", getAllQuotes);

// Default tasks
router.get("/default-tasks", getDefaultTasks);
router.put("/default-tasks/:taskId/status", statusValidation, validateRequest, updateDefaultTaskStatus);

// User tasks
router.get("/tasks", getUserTasks);
router.post("/tasks", userTaskValidation, validateRequest, createUserTask);
router.put("/tasks/:id", userTaskValidation, validateRequest, updateUserTask);
router.put("/tasks/:id/status", statusValidation, validateRequest, updateUserTaskStatus);
router.delete("/tasks/:id", deleteUserTask);

module.exports = router;
