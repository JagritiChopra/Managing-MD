const mongoose = require("mongoose");

// Default tasks seeded in DB — shared for all users, not editable
const defaultTaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    icon: {
      type: String,
      default: "✅",
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

// User's status on a default task (completed / pending)
const defaultTaskStatusSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    defaultTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DefaultTask",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index: one status record per user per default task
defaultTaskStatusSchema.index({ user: 1, defaultTask: 1 }, { unique: true });

// User's own custom tasks (full CRUD)
const userTaskSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
    },
    completedAt: {
      type: Date,
      default: null,
    },
    dueDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Index for efficient per-user task queries
userTaskSchema.index({ user: 1, createdAt: -1 });
userTaskSchema.index({ user: 1, status: 1 });

const DefaultTask = mongoose.model("DefaultTask", defaultTaskSchema);
const DefaultTaskStatus = mongoose.model("DefaultTaskStatus", defaultTaskStatusSchema);
const UserTask = mongoose.model("UserTask", userTaskSchema);

module.exports = { DefaultTask, DefaultTaskStatus, UserTask };
