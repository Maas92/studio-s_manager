import winston from "winston";
import { env } from "../config/env";
import fs from "fs";
import path from "path";

// Get environment variables
const NODE_ENV = process.env.NODE_ENV || "development";
const LOG_LEVEL =
  process.env.LOG_LEVEL || (NODE_ENV === "production" ? "warn" : "debug");
const SERVICE_NAME = process.env.SERVICE_NAME || "app-service";

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Determine log level based on environment
const level = () => {
  const isDevelopment = env.NODE_ENV === "development";
  return isDevelopment ? "debug" : "info";
};

// Define colors for each level
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
};

// Tell winston about our colors
winston.addColors(colors);

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// ============================================================================
// FORMATS
// ============================================================================

// Production format - structured JSON for log aggregation
const productionFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Development format - colorized and readable
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    // Base message with timestamp and level
    let msg = `${timestamp} [${level}]`;

    // Add service name with color
    if (service) {
      msg += ` [${service}]`;
    }

    // Add main message
    msg += `: ${message}`;

    // Add metadata if present (exclude common fields)
    const metaKeys = Object.keys(meta).filter(
      (key) =>
        !["timestamp", "level", "message", "service", "splat"].includes(key)
    );

    if (metaKeys.length > 0) {
      const cleanMeta = metaKeys.reduce((acc, key) => {
        acc[key] = meta[key];
        return acc;
      }, {} as any);
      msg += ` ${JSON.stringify(cleanMeta)}`;
    }

    // Add stack trace if present
    if (meta.stack) {
      msg += `\n${meta.stack}`;
    }

    return msg;
  })
);

// ============================================================================
// TRANSPORTS
// ============================================================================

const transports: winston.transport[] = [
  // Console transport - always enabled, format depends on environment
  new winston.transports.Console({
    format: NODE_ENV === "production" ? productionFormat : developmentFormat,
  }),
];

// File transports - only in production or if explicitly enabled
if (NODE_ENV === "production" || process.env.ENABLE_FILE_LOGGING === "true") {
  // Error log - only errors
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: productionFormat,
    })
  );

  // Combined log - all levels
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, "combined.log"),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: productionFormat,
    })
  );

  // HTTP log - only http level (for request logging)
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, "http.log"),
      level: "http",
      maxsize: 5242880, // 5MB
      maxFiles: 3,
      format: productionFormat,
    })
  );
}

// ============================================================================
// CREATE LOGGER
// ============================================================================

export const logger = winston.createLogger({
  level: LOG_LEVEL,
  levels,
  format: productionFormat,
  defaultMeta: { service: SERVICE_NAME },
  transports,
  exitOnError: false,
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a stream for Morgan HTTP logging middleware
 */
export const stream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

/**
 * Create a child logger for specific modules
 */
export const createModuleLogger = (moduleName: string) => {
  return logger.child({ module: moduleName });
};

/**
 * Log startup info
 */
export const logStartup = (config: {
  service: string;
  port: number;
  env: string;
  version?: string;
}) => {
  logger.info(`🚀 ${config.service} starting...`);
  logger.info(`📝 Environment: ${config.env}`);
  logger.info(`🔧 Port: ${config.port}`);
  logger.info(`📊 Log Level: ${LOG_LEVEL}`);
  if (config.version) {
    logger.info(`📦 Version: ${config.version}`);
  }
  logger.info(`✅ ${config.service} ready`);
};

/**
 * Log database connection
 */
export const logDatabaseConnection = (
  status: "success" | "error",
  details?: any
) => {
  if (status === "success") {
    logger.info("✅ Database connected successfully", details);
  } else {
    logger.error("❌ Database connection failed", details);
  }
};

/**
 * Log shutdown
 */
export const logShutdown = (reason?: string) => {
  logger.info(`🛑 Shutting down${reason ? `: ${reason}` : ""}...`);
};

export default logger;
