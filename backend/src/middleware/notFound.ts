import { Request, Response } from "express";

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: "not_found",
    message: "Requested API endpoint not found",
  });
}
