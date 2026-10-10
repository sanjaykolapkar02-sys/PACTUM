import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";
import { env } from "../config/env";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.name || "api_error",
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  // Handle Mongoose validation errors
  if (err.name === "ValidationError") {
    res.status(400).json({
      success: false,
      error: "validation_error",
      message: err.message,
    });
    return;
  }

  // Handle CastError (invalid ObjectId)
  if (err.name === "CastError") {
    res.status(400).json({
      success: false,
      error: "invalid_id",
      message: "Invalid resource identifier format",
    });
    return;
  }

  // Handle MongoDB duplicate key errors (code 11000)
  if ((err as any).code === 11000) {
    res.status(409).json({
      success: false,
      error: "duplicate_record",
      message: "A record with these unique constraints already exists",
    });
    return;
  }

  // Unexpected internal errors: log safely and redact internal details in production
  console.error("[Internal Server Error]", err.message);

  res.status(500).json({
    success: false,
    error: "internal_server_error",
    message: env.NODE_ENV === "production" ? "An unexpected error occurred" : err.message,
  });
}
