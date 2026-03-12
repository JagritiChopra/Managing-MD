  const { body } = require("express-validator");
  const { DefaultComfort, UserComfort } = require("../models/Comfort");
  const { successResponse, errorResponse } = require("../utils/response");
  const asyncHandler = require("../utils/asyncHandler");

  // ─── Validation Rules ──────────────────────────────────────────────────────

  exports.comfortValidation = [
    body("title").trim().notEmpty().withMessage("Title is required").isLength({ max: 200 }),
    body("description").optional().trim().isLength({ max: 1000 }),
    body("icon").optional().trim().isLength({ max: 10 }),
  ];

  // ─── Controllers ───────────────────────────────────────────────────────────

  // @route   GET /api/comfort
  exports.getAllComforts = asyncHandler(async (req, res) => {
    const [defaultComforts, userComforts] = await Promise.all([
      DefaultComfort.find({ isActive: true }).sort({ order: 1, createdAt: 1 }).lean(),
      UserComfort.find({ user: req.user._id }).sort({ createdAt: -1 }).lean(),
    ]);

    return successResponse(res, 200, "Comforts fetched", { defaultComforts, userComforts });
  });

  // @route   GET /api/comfort/default
  exports.getDefaultComforts = asyncHandler(async (req, res) => {
    const comforts = await DefaultComfort.find({ isActive: true }).sort({ order: 1 }).lean();
    return successResponse(res, 200, "Default comforts fetched", { comforts });
  });

  // @route   GET /api/comfort/my
  exports.getUserComforts = asyncHandler(async (req, res) => {
    const comforts = await UserComfort.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();
    return successResponse(res, 200, "Your comforts fetched", { comforts });
  });

  // @route   POST /api/comfort
  exports.addComfort = asyncHandler(async (req, res) => {
    const { title, description, icon } = req.body;
    const comfort = await UserComfort.create({
      user: req.user._id,
      title,
      description,
      icon: icon || "💙",
    });
    return successResponse(res, 201, "Comfort added!", { comfort });
  });

  // @route   PUT /api/comfort/:id
  exports.updateComfort = asyncHandler(async (req, res) => {
    const { title, description, icon } = req.body;
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (icon !== undefined) updates.icon = icon;

    const comfort = await UserComfort.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!comfort) return errorResponse(res, 404, "Comfort not found.");
    return successResponse(res, 200, "Comfort updated!", { comfort });
  });

  // @route   DELETE /api/comfort/:id
  exports.deleteComfort = asyncHandler(async (req, res) => {
    const comfort = await UserComfort.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!comfort) return errorResponse(res, 404, "Comfort not found.");
    return successResponse(res, 200, "Comfort deleted.");
  });
