const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Duration in seconds
    duration: {
      type: Number,
      required: [true, "Session duration is required"],
      min: [1, "Duration must be at least 1 second"],
    },
    emotion: {
      type: String,
      enum: ["happy", "sad", "anxious", "bored", "stressed", "calm", "excited", "neutral", "other"],
      default: "neutral",
    },
    emotionNote: {
      type: String,
      trim: true,
      maxlength: [200, "Emotion note cannot exceed 200 characters"],
      default: "",
    },
    sessionDate: {
      type: Date,
      required: [true, "Session date is required"],
      default: Date.now,
    },
    startTime: {
      type: String, // "HH:MM" format
      default: "",
    },
    endTime: {
      type: String,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
      default: "",
    },
  },
  { timestamps: true }
);

// Index for efficient date-based queries
sessionSchema.index({ user: 1, sessionDate: -1 });

module.exports = mongoose.model("Session", sessionSchema);
