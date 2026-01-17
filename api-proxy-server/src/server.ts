import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import app from "./app.js";

const server = app.listen(env.PORT, () => {
  logger.info(
    {
      port: env.PORT,
      env: env.NODE_ENV,
      authService: env.AUTH_SERVICE_URL,
      inventoryService: env.INVENTORY_SERVICE_URL,
    },
    "🚀 API Gateway started successfully"
  );
});

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  logger.info(
    { signal },
    "🛑 Shutdown signal received — starting graceful shutdown"
  );

  server.close(() => {
    logger.info("✅ HTTP server closed gracefully");
    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error(
      { signal },
      "⏱️ Graceful shutdown timed out — forcing process exit"
    );
    process.exit(1);
  }, 30000);
};

// Error handlers
process.on("unhandledRejection", (err: unknown) => {
  logger.error(
    {
      err,
      type: "unhandledRejection",
    },
    "💥 Unhandled promise rejection"
  );

  gracefulShutdown("UNHANDLED_REJECTION");
});

process.on("uncaughtException", (err: Error) => {
  logger.fatal(
    {
      err,
      type: "uncaughtException",
    },
    "🔥 Uncaught exception — application will exit"
  );

  process.exit(1);
});

// Graceful shutdown signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

export default server;
