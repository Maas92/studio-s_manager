import app from "./app.js";
import { env } from "./config/env.js";
import { logStartup, logger } from "./utils/logger.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { initKeys } from "./config/jwt.js";
import { tokenService } from "./services/tokenService.js";

// Handle uncaught exceptions
process.on("uncaughtException", (err: Error) => {
  logger.error(
    {
      error: err.name,
      message: err.message,
      stack: err.stack,
    },
    "UNCAUGHT EXCEPTION! Shutting down..."
  );
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
    logger.info("Database connected successfully");

    // Start session cleanup job (every hour)
    setInterval(
      async () => {
        try {
          await tokenService.cleanupExpiredSessions();
        } catch (error) {
          logger.error({ error }, "Session cleanup error");
        }
      },
      60 * 60 * 1000
    ); // 1 hour

    // Start Express server
    const PORT = env.PORT || 5002;
    server = app.listen(PORT, () => {
      logStartup({
        service: env.SERVICE_NAME || "auth-service",
        port: PORT,
        env: env.NODE_ENV || "development",
      });

      logger.info(`🚀 Auth service running on port ${PORT}`);
      logger.info(`Environment: ${env.NODE_ENV}`);
      logger.info(`CORS origin: ${env.CORS_ORIGIN}`);
    });

    // Graceful shutdown on SIGTERM / SIGINT
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      if (server) server.close();
      await disconnectDatabase();
      logger.info("Shutdown complete");
      process.exit(0);
    };
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    logger.error({ error }, "Bootstrap error, shutting down");
    process.exit(1);
  }
}

// Run bootstrap
bootstrap();
