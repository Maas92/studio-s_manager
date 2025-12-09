import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger.js";

export const cookieDebugMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.debug("\n=== COOKIE DEBUG ===");
  logger.debug("Path:", req.path);
  logger.debug("Method:", req.method);
  logger.debug("Cookie header:", req.headers.cookie);
  logger.debug("Parsed cookies:", req.cookies);
  logger.debug("===================\n");

  // Intercept res.setHeader to log Set-Cookie
  const originalSetHeader = res.setHeader.bind(res);
  res.setHeader = function (name: string, value: any) {
    if (name.toLowerCase() === "set-cookie") {
      logger.debug("\n🍪 SET-COOKIE BEING SET:");
      logger.debug(value);
      logger.debug("🍪 END SET-COOKIE\n");
    }
    return originalSetHeader(name, value);
  };

  next();
};
