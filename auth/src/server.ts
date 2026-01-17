import pino from "pino";

const NODE_ENV = process.env.NODE_ENV || "development";
const LOG_LEVEL =
  process.env.LOG_LEVEL || (NODE_ENV === "production" ? "info" : "debug");

const SERVICE_NAME = process.env.SERVICE_NAME || "app-service";

/**
 * Base Pino logger
 */
export const logger = pino({
  level: LOG_LEVEL,
  base: {
    service: SERVICE_NAME,
    env: NODE_ENV,
  },

  // Loki prefers epoch millis or RFC3339
  timestamp: pino.stdTimeFunctions.epochTime,

  formatters: {
    level(label) {
      return { level: label };
    },
  },
});

/**
 * Create a child logger for modules
 */
export const createModuleLogger = (module: string) => logger.child({ module });

/**
 * Express HTTP logger (Morgan replacement)
 */
export function httpLogger(req: any, res: any, next: any) {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;

    logger.info(
      {
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs,
        requestId: req.requestId ?? req.id,
      },
      "🌐 HTTP request completed"
    );
  });

  next();
}

/**
 * Startup logging
 */
export function logStartup(config: {
  service: string;
  port: number;
  env: string;
  version?: string;
}) {
  logger.info(
    {
      service: config.service,
      port: config.port,
      env: config.env,
      version: config.version,
    },
    "🚀 Service starting"
  );
}

/**
 * Database connection logging
 */
export function logDatabaseConnection(
  status: "success" | "error",
  details?: Record<string, any>
) {
  if (status === "success") {
    logger.info(details ?? {}, "🗄️ Database connected");
  } else {
    logger.error(details ?? {}, "❌ Database connection failed");
  }
}

/**
 * Graceful shutdown logging
 */
export function logShutdown(reason?: string) {
  logger.info({ reason }, "🛑 Service shutting down gracefully");
}

export default logger;
