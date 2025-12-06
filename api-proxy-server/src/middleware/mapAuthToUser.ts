import { Request, Response, NextFunction } from "express";

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
      // Map any other fields you need
      firstName: req.auth.firstName,
      lastName: req.auth.lastName,
    };
    console.log("✅ Mapped req.auth to req.user:", {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
    });
  } else {
    console.log("⚠️ No req.auth found - user not authenticated");
  }
  next();
};
