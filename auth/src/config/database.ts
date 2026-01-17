import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(env.MONGODB_URI, {
      maxPoolSize: 10,
      minPoolSize: 5,
      socketTimeoutMS: 45_000,
      serverSelectionTimeoutMS: 5_000,
    });

    logger.info("✅ MongoDB connected successfully");

    mongoose.connection.on("error", (err) => {
      logger.error({ err }, "❌ MongoDB connection error");
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("⚠️ MongoDB disconnected");
    });
  } catch (err) {
    logger.error({ err }, "❌ MongoDB connection failed");
    throw err;
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await mongoose.connection.close();
    logger.info("🛑 MongoDB connection closed");
  } catch (err) {
    logger.error({ err }, "❌ Failed to close MongoDB connection");
  }
}
