import { z } from 'zod';
import { formatValidationIssues } from '../../http/validation.ts';
import { CvError } from '../cv.errors.ts';

const httpUrl = z.url({ protocol: /^https?$/ }).max(4_000);
export const draftSchema = z.object({
  url: z.union([httpUrl, z.literal('')]),
  company: z.string().trim().max(200),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(30_000),
});

export const postingSchema = z.object({ url: httpUrl });
export const pdfNameSchema = z.string().trim().min(1).max(255);
export const cvIdSchema = z.uuid();
export const attachmentSchema = z.object({ cvId: cvIdSchema.nullable() });
export function validated<T>(schema: z.ZodType<T>, input: unknown) {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new CvError(
      'invalid-input',
      formatValidationIssues(result.error.issues),
    );
  }
  return result.data;
}
