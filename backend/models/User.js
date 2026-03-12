const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // Never return password in queries
    },
    dob: {
      type: Date,
      default: null,
    },
    address: {
      type: String,
      trim: true,
      maxlength: [300, "Address cannot exceed 300 characters"],
      default: "",
    },
    goal: {
      type: String,
      trim: true,
      maxlength: [500, "Goal cannot exceed 500 characters"],
      default: "",
    },
    why: {
      type: String,
      trim: true,
      maxlength: [500, "Reason cannot exceed 500 characters"],
      default: "",
    },
    avatar: {
      type: String, // stores file path or URL
      default: "",
    },
    isVerified: {
      type: Boolean,
      default: true, // Set false if you add email verification
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpire: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate password reset token
userSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.resetPasswordExpire = Date.now() + parseInt(process.env.RESET_TOKEN_EXPIRE || 15) * 60 * 1000;

  return resetToken; // Return unhashed token (sent to email)
};

module.exports = mongoose.model("User", userSchema);
