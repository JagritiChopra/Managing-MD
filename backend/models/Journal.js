const mongoose = require("mongoose");

const journalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Entry is stored encrypted (AES via crypto-js)
    encryptedEntry: {
      type: String,
      required: [true, "Journal entry is required"],
    },
    // Store date separately for filtering (not encrypted)
    entryDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    entryTime: {
      type: String, // "HH:MM" 24h format
      default: "",
    },
    mood: {
      type: String,
      enum: ["great", "good", "neutral", "bad", "terrible"],
      default: "neutral",
    },
    wordCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Index for efficient user + date queries
journalSchema.index({ user: 1, entryDate: -1 });

module.exports = mongoose.model("Journal", journalSchema);
