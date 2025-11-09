export default class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string = "Bad request"): AppError {
    return new AppError(message, 400);
  }

  static unauthorized(message: string = "Unauthorized"): AppError {
    return new AppError(message, 401);
  }

  static forbidden(message: string = "Forbidden"): AppError {
    return new AppError(message, 403);
  }

  static notFound(message: string = "Not found"): AppError {
    return new AppError(message, 404);
  }

  static conflict(message: string = "Conflict"): AppError {
    return new AppError(message, 409);
  }

  static internal(message: string = "Internal server error"): AppError {
    return new AppError(message, 500);
  }
}
