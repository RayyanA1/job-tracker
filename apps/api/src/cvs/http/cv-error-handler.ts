import type { ErrorRequestHandler } from 'express';
import { CvError, type CvErrorCode } from '../cv.errors.ts';

const statusByCode: Record<CvErrorCode, number> = {
  'invalid-input': 400,
  'not-found': 404,
  'invalid-content': 422,
  'provider-rate-limited': 429,
  'provider-failed': 502,
  'provider-unavailable': 503,
};

export const handleCvError: ErrorRequestHandler = (error, _req, res, next) => {
  if (error instanceof CvError) {
    res.status(statusByCode[error.code]).json({ error: error.message });
  } else if (error.status === 413) {
    res.status(413).json({ error: 'Choose a PDF under 10 MB.' });
  } else {
    next(error);
  }
};
