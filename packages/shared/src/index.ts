import { z } from 'zod';
export const statuses = [
  'Applied',
  'Interviewing',
  'Offer',
  'Rejected',
  'Withdrawn',
] as const;
export const stageStatuses = [
  'Planned',
  'Scheduled',
  'Completed',
  'Cancelled',
] as const;
const date = z.union([z.literal(''), z.iso.date()]);
const url = z.union([
  z.literal(''),
  z.url().refine((v) => /^https?:\/\//i.test(v), 'Use an http or https URL'),
]);
export const applicationSchema = z
  .object({
    company: z.string().trim().min(1).max(200),
    role: z.string().trim().min(1).max(200),
    status: z.enum(statuses).default('Applied'),
    rating: z.number().int().min(1).max(5).nullable().default(null),
    jobLink: url.default(''),
    dateApplied: date.default(''),
    notes: z.string().max(100000).default(''),
    cvReference: z.string().max(2000).default(''),
    nextAction: z.string().max(2000).default(''),
    nextActionDate: date.default(''),
    totalRounds: z.number().int().min(1).max(100).nullable().default(null),
    currentStageId: z.uuid().nullable().default(null),
    answers: z
      .array(
        z.object({
          id: z.uuid(),
          question: z.string().trim().min(1).max(2000),
          answer: z.string().max(100000),
        }),
      )
      .max(100)
      .default([]),
    stages: z
      .array(
        z.object({
          id: z.uuid(),
          name: z.string().trim().min(1).max(200),
          date: date,
          status: z.enum(stageStatuses),
          summary: z.string().max(100000),
          notes: z.string().max(100000),
        }),
      )
      .max(100)
      .default([]),
  })
  .superRefine((a, ctx) => {
    if (a.currentStageId && !a.stages.some((s) => s.id === a.currentStageId))
      ctx.addIssue({
        code: 'custom',
        path: ['currentStageId'],
        message: 'Current stage must exist',
      });
    if (a.totalRounds && a.totalRounds < a.stages.length)
      ctx.addIssue({
        code: 'custom',
        path: ['totalRounds'],
        message: 'Total rounds cannot be less than the number of stages',
      });
    if (a.nextActionDate && !a.nextAction.trim())
      ctx.addIssue({
        code: 'custom',
        path: ['nextAction'],
        message: 'Enter a next action for its due date',
      });
    for (const key of ['answers', 'stages'] as const)
      if (new Set(a[key].map((x) => x.id)).size !== a[key].length)
        ctx.addIssue({ code: 'custom', path: [key], message: 'Duplicate IDs' });
  });
export type ApplicationInput = z.infer<typeof applicationSchema>;
export type Application = ApplicationInput & { id: string; updatedAt: string };
export function progress(a: ApplicationInput) {
  const index = a.stages.findIndex((s) => s.id === a.currentStageId);
  return index < 0
    ? 'No current stage'
    : `${a.stages[index]!.name} · round ${index + 1}${a.totalRounds ? ` of ${a.totalRounds}` : ''}`;
}
