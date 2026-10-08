import type { Request, Response, NextFunction } from 'express';
import { AuthenticationError } from '../auth/tokens.ts';
import { logger } from '../logging/logger.ts';

export function productionErrorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const correlationId = req.correlationId;
  const isProd = process.env.NODE_ENV === 'production';

  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let subsystem = 'BACKEND';
  let message = 'An unexpected internal error occurred.';

  if (err instanceof AuthenticationError || err.name === 'AuthenticationError') {
    statusCode = err.statusCode || 401;
    code = err.code || 'UNAUTHENTICATED';
    subsystem = 'AUTH';
    message = err.message;
  } else if (err.code === 'PRIVATE_ALPHA_RESTRICTED') {
    statusCode = 403;
    code = 'PRIVATE_ALPHA_RESTRICTED';
    subsystem = 'AUTH';
    message = err.message;
  } else if (err.name === 'ValidationError' || err.status === 400 || statusCode === 400) {
    statusCode = 400;
    code = 'BAD_REQUEST';
    subsystem = 'JARVIS_APP';
    message = err.message || 'Invalid request payload.';
  } else if (err.message?.includes('not found') || err.status === 404) {
    statusCode = 404;
    code = 'NOT_FOUND';
    subsystem = 'JARVIS_APP';
    message = err.message || 'Resource not found.';
  } else if (
    err.message?.includes('Gemini') ||
    err.message?.includes('quota') ||
    err.message?.includes('GoogleGenAI')
  ) {
    statusCode = 502;
    code = 'GEMINI_PROVIDER_ERROR';
    subsystem = 'GEMINI';
    message = 'Intelligence provider encountered an operational error.';
  }

  logger.error(
    subsystem as any,
    `Unhandled error on ${req.method} ${req.path}: ${err.message}`,
    err,
    { statusCode },
    correlationId
  );

  // In production, never return internal stack traces to the client
  res.status(statusCode).json({
    error: {
      code,
      message:
        isProd && statusCode === 500
          ? 'An unexpected internal system error occurred. Please contact administrator.'
          : message,
      subsystem,
      correlationId,
      timestamp: new Date().toISOString()
    }
  });
}
