import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import AppError from "../utils/appError.js";

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.issues.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        }));

        return next(
          new AppError(
            `Validation error: ${messages.map((m) => m.message).join(", ")}`,
            400
          )
        );
      }
      next(error);
    }
  };
};
