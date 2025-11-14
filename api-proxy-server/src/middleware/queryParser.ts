import { Request, Response, NextFunction } from "express";
import { parse } from "querystring";

export const queryParser = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Express 5 compatibility: ensure query is writable
  if (req.url.includes("?")) {
    const queryString = req.url.split("?")[1];
    try {
      // Parse manually if query is not set
      if (!req.query || Object.keys(req.query).length === 0) {
        const parsed = parse(queryString);
        Object.defineProperty(req, "query", {
          value: parsed,
          writable: true,
          enumerable: true,
          configurable: true,
        });
      }
    } catch (error) {
      console.error("Query parsing error:", error);
    }
  }
  next();
};
