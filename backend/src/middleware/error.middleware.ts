import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  logger.error(`[Unhandled Error] Path: ${req.path} - Method: ${req.method} - Error:`, err.message || err);

  const statusCode = err.statusCode || err.status || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';

  // Sanitized message for production / user exposure
  let clientMessage = 'An unexpected error occurred. Please try again.';

  if (statusCode < 500 && err.message) {
    clientMessage = err.message;
  } else if (err.code === 'EMAIL_ALREADY_EXISTS' || err.code === 'INVALID_CREDENTIALS') {
    clientMessage = err.message;
  }

  return sendError(res, code, clientMessage, statusCode);
}
