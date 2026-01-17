import { Request, Response, NextFunction } from "express";
import AppError from "../utils/appError.js";
import { logger } from "../utils/logger.js";
import { env, isProduction } from "../config/env.js";

// --- Specific error handlers ---
const handleCastErrorDB = (err: any): AppError => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return AppError.badRequest(message);
};

const handleDuplicateFieldsDB = (err: any): AppError => {
  const field = Object.keys(err.keyValue || {})[0] || "field";
  const value = err.keyValue?.[field];
  const message = `Duplicate value for ${field}: ${value}. Please use another value`;
  return AppError.conflict(message);
};

const handleValidationErrorDB = (err: any): AppError => {
  const errors = Object.values(err.errors || {}).map((el: any) => el.message);
  const message = `Invalid input data. ${errors.join(". ")}`;
  return AppError.badRequest(message);
};

const handleJWTError = (): AppError =>
  AppError.unauthorized("Invalid token. Please log in again");

const handleJWTExpiredError = (): AppError =>
  AppError.unauthorized("Your token has expired. Please log in again");

const handleArgon2Error = (): AppError =>
  AppError.internal("Authentication error. Please try again");

// --- Error senders ---
const sendErrorDev = (err: AppError, req: Request, res: Response): void => {
  logger.error(
    { err, url: req.originalUrl, method: req.method, ip: req.ip },
    "❌ Development error"
  );

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    error: err,
    stack: err.stack,
  });
};

const sendErrorProd = (err: AppError, req: Request, res: Response): void => {
  if (err.isOperational) {
    logger.warn(
      { err, url: req.originalUrl, method: req.method, ip: req.ip },
      "⚠️ Operational error"
    );

    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    logger.error(
      { err, url: req.originalUrl, method: req.method, ip: req.ip },
      "❌ Non-operational error"
    );

    res.status(500).json({
      status: "error",
      message: "Something went wrong. Please try again later",
    });
  }
};

// --- Middleware ---
export default (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (!isProduction) {
    sendErrorDev(err, req, res);
  } else {
    let error = Object.create(err);
    error.message = err.message;

    // Handle specific errors
    if (error.name === "CastError") error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === "ValidationError") error = handleValidationErrorDB(error);
    if (error.name === "JsonWebTokenError") error = handleJWTError();
    if (error.name === "TokenExpiredError") error = handleJWTExpiredError();
    if (error.message?.includes("Argon2")) error = handleArgon2Error();

    sendErrorProd(error, req, res);
  }
};
