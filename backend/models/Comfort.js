const mongoose = require("mongoose");

// Default comforts — seeded in DB, visible to all users, cannot be deleted
const defaultComfortSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    icon: {
      type: String,
      default: "🌿",
    },
    category: {
      type: String,
      enum: ["breathing", "movement", "grounding", "distraction", "social", "creativity", "mindfulness"],
      default: "mindfulness",
    },
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// User's custom comforts — full create/delete
const userComfortSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
      default: "",
    },
    icon: {
      type: String,
      default: "💙",
    },
  },
  { timestamps: true }
);

userComfortSchema.index({ user: 1, createdAt: -1 });

const DefaultComfort = mongoose.model("DefaultComfort", defaultComfortSchema);
const UserComfort = mongoose.model("UserComfort", userComfortSchema);

module.exports = { DefaultComfort, UserComfort };
