import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger.js";

export const mapAuthToUser = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  if (req.auth) {
    req.user = {
      id: req.auth.sub,
      email: req.auth.email,
      role: req.auth.role,
      firstName: req.auth.firstName,
      lastName: req.auth.lastName,
    };

    logger.debug(
      {
        userId: req.user.id,
        email: req.user.email,
        role: req.user.role,
      },
      "Mapped req.auth to req.user"
    );
  } else {
    logger.warn(
      {
        path: req.path,
        method: req.method,
      },
      "No req.auth found – user not authenticated"
    );
  }

  next();
};
