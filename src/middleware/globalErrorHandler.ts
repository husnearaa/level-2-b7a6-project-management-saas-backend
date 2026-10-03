import type { Request, Response, NextFunction } from "express";

import { ZodError } from "zod";
import AppError from "../utils/appError";

const globalErrorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let message = "Something went wrong";
  let errors: unknown[] = [];

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (error instanceof ZodError) {
    statusCode = 400;
    message = "Validation error";

    errors = error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
  } else if (error instanceof Error) {
    message = error.message;
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
};

export default globalErrorHandler;