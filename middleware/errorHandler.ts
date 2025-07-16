import { Request, Response, NextFunction } from 'express';

interface ApiError extends Error {
  statusCode?: number;
  details?: string[];
}

export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Σφάλμα διακομιστή';
  const details = err.details || [];

  res.status(statusCode).json({
    error: true,
    message,
    details,
    code: statusCode,
  });
};