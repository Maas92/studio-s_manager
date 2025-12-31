import https from "https";
import fs from "fs";
import app from "./app.js";
import { env } from "./config/env.js";
import { testConnection, closePool } from "./config/database.js";
import { logger } from "./utils/logger.js";

const port = env.PORT;

// if (process.env.MTLS_ENABLED === 'true') {
//   const options = {
//     cert: fs.readFileSync(process.env.MTLS_CERT),
//     key: fs.readFileSync(process.env.MTLS_KEY),
//     ca: fs.readFileSync(process.env.MTLS_CA_CERT),
//     requestCert: true,
//     rejectUnauthorized: true,
//   };

//   https.createServer(options, app).listen(5003);
// } else {
//   app.listen(5003); // HTTP for now
// }

/**
 * Start the Express server
 */
const server = app.listen(port, async () => {
  try {
    // Test database connection before starting server
    const dbConnected = await testConnection();

    if (!dbConnected) {
      logger.error("Failed to connect to database. Exiting...");
      process.exit(1);
    }

    // Start HTTP server
    const host =
      process.env.NODE_ENV === "production" ? "gateway" : "localhost";

    logger.info(`🚀 Backend Service running on port ${port}`);
    logger.info(`📝 Environment: ${env.NODE_ENV}`);
    logger.info(`🔗 API: http://${host}:${port}/api/v1`);
    logger.info(`❤️ Health: http://${host}:${port}/health`);
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
});

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
