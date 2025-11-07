import { Request, Response, NextFunction } from "express";

export interface UserRequest extends Request {
  user?: { id?: string; role?: string; email?: string };
}

export const extractUser = (
  req: UserRequest,
  _res: Response,
  next: NextFunction
) => {
  const id = req.headers["x-user-id"]
    ? String(req.headers["x-user-id"])
    : undefined;
  const role = req.headers["x-user-role"]
    ? String(req.headers["x-user-role"])
    : undefined;
  const email = req.headers["x-user-email"]
    ? String(req.headers["x-user-email"])
    : undefined;
  req.user = { id, role, email };
  next();
};

export const restrictTo = (...roles: string[]) => {
  return (req: UserRequest, res: Response, next: NextFunction) => {
    if (!req.user?.role) {
      return res
        .status(401)
        .json({ status: "fail", message: "You are not logged in" });
    }
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ status: "fail", message: "You do not have permission" });
    }
    next();
  };
};
