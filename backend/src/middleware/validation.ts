import { Request, Response, NextFunction } from "express";
import { ZodObject, ZodError } from "zod";
import { logger } from "../utils/logger";

/**
 * Middleware factory for validating request data using Zod schemas
 * @param schema - Zod schema for validation
 * @returns Express middleware function
 */
export const validate = (schema: ZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body, query, and params
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        }));

        logger.warn(`Validation failed for ${req.method} ${req.path}:`, errors);

        return res.status(400).json({
          status: "fail",
          message: "Validation failed",
          errors,
        });
      }

      // Pass other errors to global error handler
      next(error);
    }
  };
};

/**
 * Middleware for validating UUID parameters
 */
export const validateUUID = (paramName: string = "id") => {
  return (req: Request, res: Response, next: NextFunction) => {
    const uuid = req.params[paramName];
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuid || !uuidRegex.test(uuid)) {
      logger.warn(`Invalid UUID provided: ${uuid}`);
      return res.status(400).json({
        status: "fail",
        message: `Invalid ${paramName}. Must be a valid UUID.`,
      });
    }

    next();
  };
};
