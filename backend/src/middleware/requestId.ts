import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

/**
 * Middleware to add a unique request ID to each request
 * The ID is also added to response headers for tracing
 */
export const requestId = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Use existing request ID from header or generate a new one
  const id = (req.headers["x-request-id"] as string) || randomUUID();

  req.id = id;
  res.setHeader("X-Request-Id", id);

  next();
};
