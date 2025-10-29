import { Request, Response, NextFunction } from "express";
import AppError from "../utils/appError.js";

const handleDatabaseError = (err: any): AppError => {
  if (err.code === "23505") {
    const value = err.detail.match(/(Key \(.*?\)=\(.*?\))/)[0];
    const message = `Duplicate field value: ${value}. Please use another value!`;
    return new AppError(message, 400);
  }

  if (err.code === "23503") {
    return new AppError("Invalid reference to related data", 400);
  }

  if (err.code === "22P02") {
    return new AppError("Invalid input syntax", 400);
  }

  return new AppError("Database error occurred", 500);
};

const sendErrorDev = (err: AppError, res: Response): void => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err: AppError, res: Response): void => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    console.error("ERROR 💥", err);
    res.status(500).json({
      status: "error",
      message: "Something went very wrong!",
    });
  }
};

export default (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === "production") {
    let error = { ...err };
    error.message = err.message;

    if (err.code) error = handleDatabaseError(error);

    sendErrorProd(error, res);
  }
};
