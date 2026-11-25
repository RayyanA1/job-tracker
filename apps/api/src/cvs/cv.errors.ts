export type CvErrorCode =
  | 'invalid-input'
  | 'not-found'
  | 'invalid-content'
  | 'provider-rate-limited'
  | 'provider-failed'
  | 'provider-unavailable';

export class CvError extends Error {
  constructor(
    public readonly code: CvErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export function unreadablePosting() {
  return new CvError(
    'invalid-content',
    'Could not read this posting. Paste the job description to continue.',
  );
}
