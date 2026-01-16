import promClient from "prom-client";
import { Request, Response, NextFunction } from "express";

/**
 * Prometheus Registry
 */
const register = new promClient.Registry();

/**
 * Global default labels (VERY IMPORTANT for multi-service setups)
 */
register.setDefaultLabels({
  service: process.env.SERVICE_NAME || "unknown",
  env: process.env.NODE_ENV || "development",
});

/**
 * Collect default Node.js metrics (CPU, memory, GC, event loop, etc.)
 */
promClient.collectDefaultMetrics({ register });

/**
 * =========================
 * HTTP METRICS
 * =========================
 */

const httpRequestDuration = new promClient.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.05, 0.1, 0.2, 0.3, 0.5, 1, 2],
});

const httpRequestsTotal = new promClient.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
});

const httpRequestsInProgress = new promClient.Gauge({
  name: "http_requests_in_progress",
  help: "Number of HTTP requests currently in progress",
  labelNames: ["method", "route"],
});

/**
 * =========================
 * DOMAIN-SPECIFIC METRICS
 * =========================
 */

const databaseQueryDuration = new promClient.Histogram({
  name: "database_query_duration_seconds",
  help: "Duration of database queries in seconds",
  labelNames: ["query_type", "table"],
  buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2],
});

const authenticationAttempts = new promClient.Counter({
  name: "authentication_attempts_total",
  help: "Total number of authentication attempts",
  labelNames: ["status", "method"],
});

const activeUsers = new promClient.Gauge({
  name: "active_users",
  help: "Number of currently active users",
});

/**
 * Register metrics
 */
[
  httpRequestDuration,
  httpRequestsTotal,
  httpRequestsInProgress,
  databaseQueryDuration,
  authenticationAttempts,
  activeUsers,
].forEach((metric) => register.registerMetric(metric as promClient.Metric));

/**
 * =========================
 * HTTP METRICS MIDDLEWARE
 * =========================
 *
 * IMPORTANT:
 * - Must be mounted AFTER routes are registered
 * - Never use req.path as a label
 */
export function metricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const startTime = process.hrtime();

  // Use normalized route path ONLY
  const route =
    (req.route && req.route.path) ||
    (req.baseUrl ? `${req.baseUrl}` : "unknown");

  const method = req.method;

  httpRequestsInProgress.inc({ method, route });

  res.on("finish", () => {
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const duration = seconds + nanoseconds / 1e9;

    const labels = {
      method,
      route,
      status_code: res.statusCode,
    };

    httpRequestDuration.observe(labels, duration);
    httpRequestsTotal.inc(labels);
    httpRequestsInProgress.dec({ method, route });
  });

  next();
}

/**
 * =========================
 * /metrics ENDPOINT
 * =========================
 */
export async function metricsEndpoint(_req: Request, res: Response) {
  res.setHeader("Content-Type", register.contentType);
  res.end(await register.metrics());
}

/**
 * =========================
 * HELPER FUNCTIONS
 * =========================
 */

export function trackAuthAttempt(
  status: "success" | "failure",
  method: string
) {
  authenticationAttempts.inc({ status, method });
}

export function trackDatabaseQuery(
  queryType: string,
  table: string,
  durationSeconds: number
) {
  databaseQueryDuration.observe(
    { query_type: queryType, table },
    durationSeconds
  );
}

export function updateActiveUsers(count: number) {
  activeUsers.set(count);
}
