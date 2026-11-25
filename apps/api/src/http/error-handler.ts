import type { ErrorRequestHandler } from 'express';
import { logger } from '../utils/logger.ts';

export const handleApiError: ErrorRequestHandler = (
  error: Error & { status?: number },
  _req,
  res,
  _next,
) => {
  logger.error(error);
  res.status(error.status ?? 500).json({
    error:
      error.status === 400
        ? 'Invalid JSON'
        : 'Unable to save or load data. Please try again.',
  });
};
