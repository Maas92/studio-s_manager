import http from "http";
import app from "./app";
import { env } from "./config/env";
import { testConnection, closePool } from "./config/database";
import { logger } from "./utils/logger.js";

const port = env.PORT;
let server: http.Server;

/**
 * Start the Express server
 */
const startServer = async () => {
  try {
    // Test database connection before starting server
    const dbConnected = await testConnection();

    if (!dbConnected) {
      logger.error("Failed to connect to database. Exiting...");
      process.exit(1);
    }

    // Start HTTP server
    server = app.listen(port, () => {
      logger.info(`🚀 Backend Service running on port ${port}`);
      logger.info(`📝 Environment: ${env.NODE_ENV}`);
      logger.info(`🔗 API: http://localhost:${port}/api/v1`);
      logger.info(`❤️  Health: http://localhost:${port}/health`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

/**
 * Graceful shutdown handler
 */
const gracefulShutdown = async (signal: string) => {
  logger.info(`\n${signal} received. Starting graceful shutdown...`);

  if (server) {
    server.close(async () => {
      logger.info("✅ HTTP server closed");

      try {
        await closePool();
        logger.info("✅ Database connections closed");
        logger.info("👋 Graceful shutdown completed");
        process.exit(0);
      } catch (err) {
        logger.error("Error during shutdown:", err);
        process.exit(1);
      }
    });

    // Force close after 10 seconds
    setTimeout(() => {
      logger.error("⚠️  Forcing shutdown after timeout");
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

// Handle process termination signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason: Error, promise: Promise<any>) => {
  logger.error("🚨 UNHANDLED REJECTION! Shutting down...");
  logger.error("Reason:", reason);
  logger.error("Promise:", promise);
  gracefulShutdown("UNHANDLED_REJECTION");
});

// Handle uncaught exceptions
process.on("uncaughtException", (err: Error) => {
  logger.error("🚨 UNCAUGHT EXCEPTION! Shutting down...");
  logger.error("Error:", err.name, err.message);
  logger.error("Stack:", err.stack);
  process.exit(1);
});

// Start the server
startServer();
