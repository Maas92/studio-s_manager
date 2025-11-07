import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import app from "./app.js";
import { initKeys } from "./utils/jwt.js";

const must = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env: ${k}`);
  return v;
};

const DB = (process.env.MONGODB_URI || "").replace(
  "<db_password>",
  process.env.DATABASE_PASSWORD || ""
);

const PORT = process.env.DB_PORT || 5432;

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION 💥", err);
  process.exit(1);
});

let server: import("http").Server;

(async () => {
  await initKeys();
  await mongoose.connect(DB);
  console.log("✅ MongoDB connected");
  server = app.listen(PORT, () => console.log(`🚀 Auth on :${PORT}`));
})().catch((e) => {
  console.error("❌ Boot error", e);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION 💥", err);
  server?.close(() => process.exit(1));
});

process.on("SIGTERM", () => {
  console.log("👋 SIGTERM received");
  server?.close(() => console.log("💥 Process terminated"));
});
