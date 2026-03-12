const { body } = require("express-validator");
const Session = require("../models/Session");
const { successResponse, errorResponse, paginatedResponse } = require("../utils/response");
const asyncHandler = require("../utils/asyncHandler");

// ─── Validation Rules ──────────────────────────────────────────────────────

exports.sessionValidation = [
  body("duration").isInt({ min: 1 }).withMessage("Duration must be a positive integer (seconds)"),
  body("emotion")
    .optional()
    .isIn(["happy", "sad", "anxious", "bored", "stressed", "calm", "excited", "neutral", "other"])
    .withMessage("Invalid emotion value"),
  body("sessionDate").optional().isISO8601().withMessage("Invalid date format (use ISO 8601)"),
  body("startTime")
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("Start time must be in HH:MM format"),
  body("endTime")
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("End time must be in HH:MM format"),
  body("emotionNote").optional().trim().isLength({ max: 200 }),
  body("notes").optional().trim().isLength({ max: 500 }),
];

// ─── Shared date filter builder ────────────────────────────────────────────

const buildDateFilter = (userId, startDate, endDate, dateField = "sessionDate") => {
  const filter = { user: userId };
  if (startDate || endDate) {
    filter[dateField] = {};
    if (startDate) filter[dateField].$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter[dateField].$lte = end;
    }
  }
  return filter;
};

// ─── Controllers ───────────────────────────────────────────────────────────

// @route   POST /api/timer/sessions
exports.logSession = asyncHandler(async (req, res) => {
  const { duration, emotion, emotionNote, sessionDate, startTime, endTime, notes } = req.body;

  const session = await Session.create({
    user: req.user._id,
    duration,
    emotion: emotion || "neutral",
    emotionNote,
    sessionDate: sessionDate ? new Date(sessionDate) : new Date(),
    startTime,
    endTime,
    notes,
  });

  return successResponse(res, 201, "Session logged successfully!", { session });
});

// @route   GET /api/timer/sessions
exports.getSessions = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const pageInt = Math.max(parseInt(req.query.page) || 1, 1);
  const limitInt = Math.min(parseInt(req.query.limit) || 10, 50);

  const filter = buildDateFilter(req.user._id, startDate, endDate);
  const skip = (pageInt - 1) * limitInt;

  const [sessions, total] = await Promise.all([
    Session.find(filter).sort({ sessionDate: -1, createdAt: -1 }).skip(skip).limit(limitInt).lean(),
    Session.countDocuments(filter),
  ]);

  return paginatedResponse(res, sessions, total, pageInt, limitInt);
});

// @route   GET /api/timer/sessions/report
exports.getSessionReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const matchFilter = buildDateFilter(req.user._id, startDate, endDate);

  const [dailySummary, emotionBreakdown, totals] = await Promise.all([
    Session.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$sessionDate" } },
          totalDuration: { $sum: "$duration" },
          sessionCount: { $sum: 1 },
          avgDuration: { $avg: "$duration" },
        },
      },
      { $sort: { _id: -1 } },
    ]),

    Session.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: "$emotion",
          count: { $sum: 1 },
          totalDuration: { $sum: "$duration" },
        },
      },
      { $sort: { count: -1 } },
    ]),

    Session.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          totalDuration: { $sum: "$duration" },
          avgDuration: { $avg: "$duration" },
          longestSession: { $max: "$duration" },
        },
      },
    ]),
  ]);

  return successResponse(res, 200, "Report fetched", {
    dailySummary,
    emotionBreakdown,
    totals: totals[0] || { totalSessions: 0, totalDuration: 0, avgDuration: 0, longestSession: 0 },
  });
});

// @route   GET /api/timer/sessions/:id
exports.getSession = asyncHandler(async (req, res) => {
  const session = await Session.findOne({ _id: req.params.id, user: req.user._id }).lean();
  if (!session) return errorResponse(res, 404, "Session not found.");
  return successResponse(res, 200, "Session fetched", { session });
});

// @route   PUT /api/timer/sessions/:id
exports.updateSession = asyncHandler(async (req, res) => {
  const ALLOWED = ["duration", "emotion", "emotionNote", "sessionDate", "startTime", "endTime", "notes"];
  const updates = {};
  ALLOWED.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  const session = await Session.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { $set: updates },
    { new: true, runValidators: true }
  );
  if (!session) return errorResponse(res, 404, "Session not found.");
  return successResponse(res, 200, "Session updated.", { session });
});

// @route   DELETE /api/timer/sessions/:id
exports.deleteSession = asyncHandler(async (req, res) => {
  const session = await Session.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!session) return errorResponse(res, 404, "Session not found.");
  return successResponse(res, 200, "Session deleted.");
});
