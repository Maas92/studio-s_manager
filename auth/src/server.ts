import app from "./app.js";
import { env, isProduction } from "./config/env.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { initKeys } from "./config/jwt.js";
import { logger } from "./utils/logger.js";
import { tokenService } from "./services/tokenService.js";

// Handle uncaught exceptions
process.on("uncaughtException", (err: Error) => {
  logger.error("UNCAUGHT EXCEPTION! Shutting down...", {
    error: err.name,
    message: err.message,
    stack: err.stack,
  });
  process.exit(1);
});

let server: any;

async function bootstrap() {
  try {
    // Initialize JWT keys
    await initKeys();
    logger.info("JWT keys initialized");

    // Connect to database
    await connectDatabase();

    // Start session cleanup job (every hour)
    setInterval(async () => {
      try {
        await tokenService.cleanupExpiredSessions();
      } catch (error) {
        logger.error("Session cleanup error:", error);
      }
    }, 60 * 60 * 1000); // 1 hour

    // Start server
    server = app.listen(env.PORT, () => {
      logger.info(`🚀 Auth service running on port ${env.PORT}`);
      logger.info(`Environment: ${env.NODE_ENV}`);
      logger.info(`CORS origin: ${env.CORS_ORIGIN}`);
    });
  } catch (error) {
    logger.error("Bootstrap error:", error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (err: Error) => {
  logger.error("UNHANDLED REJECTION! Shutting down...", {
    error: err.name,
    message: err.message,
    stack: err.stack,
  });

  if (server) {
    server.close(async () => {
      await disconnectDatabase();
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// Handle SIGTERM
process.on("SIGTERM", () => {
  logger.info("SIGTERM received. Shutting down gracefully...");

  if (server) {
    server.close(async () => {
      logger.info("HTTP server closed");
      await disconnectDatabase();
      logger.info("Process terminated");
      process.exit(0);
    });
  }
});

// Handle SIGINT (Ctrl+C)
process.on("SIGINT", () => {
  logger.info("SIGINT received. Shutting down gracefully...");

  if (server) {
    server.close(async () => {
      logger.info("HTTP server closed");
      await disconnectDatabase();
      logger.info("Process terminated");
      process.exit(0);
    });
  }
});

// Start the application
bootstrap();
