const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // Mongoose 8+ no longer needs useNewUrlParser / useUnifiedTopology
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

// ─── Connection Event Listeners ────────────────────────────────────────────
mongoose.connection.on("disconnected", () =>
  console.warn("⚠️  MongoDB disconnected")
);
mongoose.connection.on("reconnected", () =>
  console.log("✅ MongoDB reconnected")
);
mongoose.connection.on("error", (err) =>
  console.error("❌ MongoDB error:", err.message)
);

// ─── Graceful Shutdown ─────────────────────────────────────────────────────
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received — closing MongoDB connection`);
  await mongoose.connection.close();
  process.exit(0);
};
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

module.exports = connectDB;
