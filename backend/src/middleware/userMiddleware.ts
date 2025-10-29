import { Request, Response, NextFunction } from 'express';

export interface UserRequest extends Request {
  user?: {
    id: string;
    role: string;
    email: string;
  };
}

export const extractUser = (req: UserRequest, res: Response, next: NextFunction): void => {
  // Extract user info from headers (set by API Gateway)
  if (req.headers['x-user-id']) {
    req.user = {
      id: req.headers['x-user-id'] as string,
      role: req.headers['x-user-role'] as string,
      email: req.headers['x-user-email'] as string
    };
  }
  next();
};

export const restrictTo = (...roles: string[]) => {
  return (req: UserRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'fail',
        message: 'You are not logged in'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  };
};