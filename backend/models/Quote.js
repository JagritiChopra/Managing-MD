const mongoose = require("mongoose");

const quoteSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, "Quote text is required"],
      trim: true,
    },
    author: {
      type: String,
      trim: true,
      default: "Unknown",
    },
    category: {
      type: String,
      enum: ["motivation", "focus", "mindfulness", "productivity", "general"],
      default: "general",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

quoteSchema.index({ isActive: 1, category: 1 });

module.exports = mongoose.model("Quote", quoteSchema);
