import type { z } from 'zod';

export function formatValidationIssues(
  issues: z.ZodError['issues'],
  { separator = '. ', includeEmptyPath = false } = {},
) {
  return issues
    .map(({ path, message }) =>
      path.length || includeEmptyPath
        ? `${path.join('.')}: ${message}`
        : message,
    )
    .join(separator);
}
