import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import app from "./app.js";

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 API Gateway running on port ${env.PORT}`);
  logger.info(`📝 Environment: ${env.NODE_ENV}`);
  logger.info(`🔐 Auth Service: ${env.AUTH_SERVICE_URL}`);
  logger.info(`📦 Inventory Service: ${env.INVENTORY_SERVICE_URL}`);
});

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error(
      "Could not close connections in time, forcefully shutting down"
    );
    process.exit(1);
  }, 30000);
};

// Error handlers
process.on("unhandledRejection", (err: any) => {
  logger.error("UNHANDLED REJECTION! 💥", {
    message: err?.message || err,
    stack: err?.stack,
  });
  gracefulShutdown("UNHANDLED_REJECTION");
});

process.on("uncaughtException", (err: Error) => {
  logger.error("UNCAUGHT EXCEPTION! 💥", {
    message: err.message,
    stack: err.stack,
  });
  process.exit(1);
});

// Graceful shutdown signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

export default server;
