import { Request } from "express";

declare global {
  namespace Express {
    interface Request {
      id?: string;
      user?: {
        id?: string;
        role?: string;
        email?: string;
      };
    }
  }
}

export {};
