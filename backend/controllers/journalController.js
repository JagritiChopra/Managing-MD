const { body } = require("express-validator");
const Journal = require("../models/Journal");
const { encrypt, decrypt } = require("../utils/encryption");
const { successResponse, errorResponse, paginatedResponse } = require("../utils/response");
const asyncHandler = require("../utils/asyncHandler");

// ─── Validation Rules ──────────────────────────────────────────────────────

exports.journalValidation = [
  body("entry").trim().notEmpty().withMessage("Journal entry cannot be empty"),
  body("entryDate").optional().isISO8601().withMessage("Invalid date format"),
  body("entryTime")
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("Time must be in HH:MM format"),
  body("mood")
    .optional()
    .isIn(["great", "good", "neutral", "bad", "terrible"])
    .withMessage("Invalid mood value"),
];

// ─── Helper ────────────────────────────────────────────────────────────────

const formatEntry = (doc, plainEntry) => ({
  _id: doc._id,
  entry: plainEntry,
  entryDate: doc.entryDate,
  entryTime: doc.entryTime,
  mood: doc.mood,
  wordCount: doc.wordCount,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

// ─── Controllers ───────────────────────────────────────────────────────────

// @route   POST /api/journal
exports.createEntry = asyncHandler(async (req, res) => {
  const { entry, entryDate, entryTime, mood } = req.body;

  const now = new Date();
  const wordCount = entry.trim().split(/\s+/).filter(Boolean).length;

  const journal = await Journal.create({
    user: req.user._id,
    encryptedEntry: encrypt(entry),
    entryDate: entryDate ? new Date(entryDate) : now,
    entryTime: entryTime || now.toTimeString().slice(0, 5),
    mood: mood || "neutral",
    wordCount,
  });

  return successResponse(res, 201, "Journal entry saved!", {
    journal: formatEntry(journal, entry),
  });
});

// @route   GET /api/journal
exports.getEntries = asyncHandler(async (req, res) => {
  //const { startDate, endDate, page = 1, limit = 10 } = req.query;
  const { startDate, endDate } = req.query;
  const filter = { user: req.user._id };
  if (startDate || endDate) {
    filter.entryDate = {};
    if (startDate) filter.entryDate.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.entryDate.$lte = end;
    }
  }

  const pageInt = Math.max(parseInt(req.query.page) || 1, 1);
  const limitInt = Math.min(parseInt(req.query.limit) || 10, 50);
  const skip = (pageInt - 1) * limitInt;

  const [entries, total] = await Promise.all([
    Journal.find(filter).sort({ entryDate: -1, createdAt: -1 }).skip(skip).limit(limitInt),
    Journal.countDocuments(filter),
  ]);

  const decryptedEntries = entries.map((e) => formatEntry(e, decrypt(e.encryptedEntry)));

  return paginatedResponse(res, decryptedEntries, total, pageInt, limitInt);
});

// @route   GET /api/journal/:id
exports.getEntry = asyncHandler(async (req, res) => {
  const journal = await Journal.findOne({ _id: req.params.id, user: req.user._id });
  if (!journal) return errorResponse(res, 404, "Journal entry not found.");

  return successResponse(res, 200, "Entry fetched", {
    journal: formatEntry(journal, decrypt(journal.encryptedEntry)),
  });
});

// @route   PUT /api/journal/:id
exports.updateEntry = asyncHandler(async (req, res) => {
  const { entry, entryDate, entryTime, mood } = req.body;

  const updates = {};
  let plainEntry;

  if (entry !== undefined) {
    updates.encryptedEntry = encrypt(entry);
    updates.wordCount = entry.trim().split(/\s+/).filter(Boolean).length;
    plainEntry = entry;
  }
  if (entryDate !== undefined) updates.entryDate = new Date(entryDate);
  if (entryTime !== undefined) updates.entryTime = entryTime;
  if (mood !== undefined) updates.mood = mood;

  const journal = await Journal.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { $set: updates },
    { new: true }
  );
  if (!journal) return errorResponse(res, 404, "Journal entry not found.");

  const resolvedEntry = plainEntry !== undefined ? plainEntry : decrypt(journal.encryptedEntry);

  return successResponse(res, 200, "Journal entry updated!", {
    journal: formatEntry(journal, resolvedEntry),
  });
});

// @route   DELETE /api/journal/:id
exports.deleteEntry = asyncHandler(async (req, res) => {
  const journal = await Journal.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!journal) return errorResponse(res, 404, "Journal entry not found.");
  return successResponse(res, 200, "Journal entry deleted.");
});
