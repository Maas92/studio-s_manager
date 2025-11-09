import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export const requestId = (req: Request, res: Response, next: NextFunction) => {
  req.requestId =
    (req.headers["x-request-id"] as string) ||
    crypto.randomUUID?.() ||
    crypto.randomBytes(16).toString("hex");

  res.setHeader("X-Request-ID", req.requestId);
  next();
};
