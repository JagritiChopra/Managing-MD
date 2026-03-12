const { body } = require("express-validator");
const Quote = require("../models/Quote");
const { DefaultTask, DefaultTaskStatus, UserTask } = require("../models/Task");
const { successResponse, errorResponse } = require("../utils/response");
const asyncHandler = require("../utils/asyncHandler");

// ─── Validation Rules ──────────────────────────────────────────────────────

exports.userTaskValidation = [
  body("title").trim().notEmpty().withMessage("Task title is required").isLength({ max: 200 }),
  body("description").optional().trim().isLength({ max: 500 }),
  body("dueDate").optional({ nullable: true }).isISO8601().withMessage("Invalid date format"),
];

exports.statusValidation = [
  body("status")
    .isIn(["pending", "completed"])
    .withMessage("Status must be 'pending' or 'completed'"),
];

// ─── QUOTES ────────────────────────────────────────────────────────────────

// @route   GET /api/home/quote
// @desc    Get a random active quote
// @access  Private
// PERF: Uses $sample aggregation (O(1)) instead of countDocuments + skip (O(N))
exports.getRandomQuote = asyncHandler(async (req, res) => {
  const [quote] = await Quote.aggregate([
    { $match: { isActive: true } },
    { $sample: { size: 1 } },
  ]);

  return successResponse(res, 200, "Quote fetched", { quote: quote || null });
});

// @route   GET /api/home/quotes
// @desc    Get all active quotes
// @access  Private
exports.getAllQuotes = asyncHandler(async (req, res) => {
  const quotes = await Quote.find({ isActive: true }).sort({ createdAt: -1 }).lean();
  return successResponse(res, 200, "Quotes fetched", { quotes });
});

// ─── DEFAULT TASKS ─────────────────────────────────────────────────────────

// @route   GET /api/home/default-tasks
// @desc    Get all default tasks with user's status
// @access  Private
exports.getDefaultTasks = asyncHandler(async (req, res) => {
  const defaultTasks = await DefaultTask.find({ isActive: true })
    .sort({ order: 1, createdAt: 1 })
    .lean();

  const taskIds = defaultTasks.map((t) => t._id);

  const statuses = await DefaultTaskStatus.find({
    user: req.user._id,
    defaultTask: { $in: taskIds },
  })
    .select("defaultTask status")
    .lean();

  const statusMap = Object.fromEntries(
    statuses.map((s) => [s.defaultTask.toString(), s.status])
  );

  const tasksWithStatus = defaultTasks.map((task) => ({
    _id: task._id,
    title: task.title,
    description: task.description,
    icon: task.icon,
    order: task.order,
    status: statusMap[task._id.toString()] || "pending",
  }));

  return successResponse(res, 200, "Default tasks fetched", { tasks: tasksWithStatus });
});

// @route   PUT /api/home/default-tasks/:taskId/status
// @desc    Update user's status on a default task
// @access  Private
exports.updateDefaultTaskStatus = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { status } = req.body;

  // Single query: validate task exists AND update status atomically
  const task = await DefaultTask.findOne({ _id: taskId, isActive: true }).lean();
  if (!task) {
    return errorResponse(res, 404, "Task not found.");
  }

  const statusRecord = await DefaultTaskStatus.findOneAndUpdate(
    { user: req.user._id, defaultTask: taskId },
    { status, completedAt: status === "completed" ? new Date() : null },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return successResponse(res, 200, `Task marked as ${status}`, { status: statusRecord });
});

// ─── USER TASKS ────────────────────────────────────────────────────────────

// @route   GET /api/home/tasks
// @desc    Get all user's custom tasks
// @access  Private
exports.getUserTasks = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = { user: req.user._id };
  if (status && ["pending", "completed"].includes(status)) {
    filter.status = status;
  }

  const tasks = await UserTask.find(filter).sort({ createdAt: -1 }).lean();
  return successResponse(res, 200, "Tasks fetched", { tasks });
});

// @route   POST /api/home/tasks
// @desc    Create a new user task
// @access  Private
exports.createUserTask = asyncHandler(async (req, res) => {
  const { title, description, dueDate } = req.body;
  const task = await UserTask.create({
    user: req.user._id,
    title,
    description,
    dueDate: dueDate || null,
  });
  return successResponse(res, 201, "Task created successfully!", { task });
});

// @route   PUT /api/home/tasks/:id
// @desc    Edit a user task (title, description, dueDate)
// @access  Private
exports.updateUserTask = asyncHandler(async (req, res) => {
  const { title, description, dueDate } = req.body;
  const updates = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (dueDate !== undefined) updates.dueDate = dueDate || null;

  const task = await UserTask.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { $set: updates },
    { new: true, runValidators: true }
  );
  if (!task) return errorResponse(res, 404, "Task not found.");
  return successResponse(res, 200, "Task updated successfully!", { task });
});

// @route   PUT /api/home/tasks/:id/status
// @desc    Update status of a user task
// @access  Private
exports.updateUserTaskStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const task = await UserTask.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { $set: { status, completedAt: status === "completed" ? new Date() : null } },
    { new: true }
  );
  if (!task) return errorResponse(res, 404, "Task not found.");
  return successResponse(res, 200, `Task marked as ${status}`, { task });
});

// @route   DELETE /api/home/tasks/:id
// @desc    Delete a user task
// @access  Private
exports.deleteUserTask = asyncHandler(async (req, res) => {
  const task = await UserTask.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!task) return errorResponse(res, 404, "Task not found.");
  return successResponse(res, 200, "Task deleted successfully.");
});
