import promClient from "prom-client";
import { Request, Response, NextFunction } from "express";

// Create a Registry
const register = new promClient.Registry();

// Add default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.1, 0.5, 1, 2, 5],
});

const httpRequestTotal = new promClient.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
});

const httpRequestsInProgress = new promClient.Gauge({
  name: "http_requests_in_progress",
  help: "Number of HTTP requests currently in progress",
  labelNames: ["method", "route"],
});

const databaseQueryDuration = new promClient.Histogram({
  name: "database_query_duration_seconds",
  help: "Duration of database queries in seconds",
  labelNames: ["query_type", "table"],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
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

// Register all metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(httpRequestsInProgress);
register.registerMetric(databaseQueryDuration);
register.registerMetric(authenticationAttempts);
register.registerMetric(activeUsers);

// Middleware to track HTTP metrics
export const metricsMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();
  const route = req.route?.path || req.path;

  // Track request in progress
  httpRequestsInProgress.inc({ method: req.method, route });

  // Override res.end to capture metrics
  const originalEnd = res.end.bind(res);
  res.end = function (...args: any[]) {
    const duration = (Date.now() - start) / 1000;

    // Record metrics
    httpRequestDuration.observe(
      { method: req.method, route, status_code: res.statusCode },
      duration
    );

    httpRequestTotal.inc({
      method: req.method,
      route,
      status_code: res.statusCode,
    });

    httpRequestsInProgress.dec({ method: req.method, route });

    return originalEnd(...args);
  } as any;

  next();
};

// Metrics endpoint
export const metricsEndpoint = async (req: Request, res: Response) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
};

// Helper functions to track custom events
export const trackAuthAttempt = (
  status: "success" | "failure",
  method: string
) => {
  authenticationAttempts.inc({ status, method });
};

export const trackDatabaseQuery = (
  queryType: string,
  table: string,
  duration: number
) => {
  databaseQueryDuration.observe({ query_type: queryType, table }, duration);
};

export const updateActiveUsers = (count: number) => {
  activeUsers.set(count);
};

// Usage in your app:
// import express from 'express';
// import { metricsMiddleware, metricsEndpoint } from './metrics';
//
// const app = express();
// app.use(metricsMiddleware);
// app.get('/metrics', metricsEndpoint);
