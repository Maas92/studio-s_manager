import { Request, Response, NextFunction } from "express";
import { ZodObject, ZodError } from "zod";
import AppError from "../utils/appError.js";
import { logger } from "../utils/logger.js";

/**
 * Express middleware factory. Pass a Zod object like:
 * const schema = z.object({ body: z.object({ name: z.string() }) });
 * router.post("/", validate(schema), controller);
 */
export const validate = (schema: ZodObject<any>) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((iss) => ({
          field: iss.path.join("."),
          message: iss.message,
          code: iss.code,
        }));

        logger.warn(
          {
            method: req.method,
            path: req.path,
            requestId: (req as any).id,
            errors,
          },
          "⚠️ Validation failed"
        );

        return next(
          AppError.badRequest(
            "Validation failed: " + errors.map((e) => e.message).join(", ")
          )
        );
      }
      return next(error);
    }
  };
};

/** Validate a UUID route param named `paramName` (default 'id') */
export const validateUUID = (paramName = "id") => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const uuid = req.params[paramName];
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuid || !uuidRegex.test(uuid)) {
      logger.warn(
        {
          paramName,
          value: uuid,
          requestId: (req as any).id,
        },
        "⚠️ Invalid UUID parameter"
      );

      return next(
        AppError.badRequest(`Invalid ${paramName}. Must be a valid UUID.`)
      );
    }
    next();
  };
};

/* Optional helpers exported for other modules (tests/services) */
export const formatZodError = (err: ZodError) =>
  err.issues.map((iss) => ({
    field: iss.path.join("."),
    message: iss.message,
    code: iss.code,
  }));
