import { describe, expect, it } from 'vitest';
import { applicationSchema, progress } from './index';
const stage = {
  id: 'e6230544-8749-4a90-8bd9-361a8174a561',
  name: 'Technical interview',
  date: '',
  status: 'Planned' as const,
  summary: '',
  notes: 'Pasted notes\nPrepare examples.',
};
describe('application workflow', () => {
  it('accepts only a company and role', () => {
    const a = applicationSchema.parse({ company: ' Acme ', role: 'Engineer' });
    expect(a.company).toBe('Acme');
    expect(a.status).toBe('Applied');
    expect(a.rating).toBeNull();
  });
  it('keeps current stage separate from overall status and supports unknown totals', () => {
    const a = applicationSchema.parse({
      company: 'Acme',
      role: 'Engineer',
      stages: [stage],
      currentStageId: stage.id,
    });
    expect(progress(a)).toBe('Technical interview · round 1');
    expect(a.status).toBe('Applied');
    expect(progress({ ...a, totalRounds: 4 })).toBe(
      'Technical interview · round 1 of 4',
    );
  });
  it('rejects invalid stage references, impossible dates and unsafe job links', () => {
    for (const extra of [
      { currentStageId: stage.id },
      { dateApplied: '2026-02-30' },
      { jobLink: 'javascript:alert(1)' },
      { rating: 6 },
      { company: '  ' },
      { nextActionDate: '2026-11-20' },
    ])
      expect(
        applicationSchema.safeParse({
          company: 'Acme',
          role: 'Engineer',
          ...extra,
        }).success,
      ).toBe(false);
  });
  it('rejects totals smaller than known stages', () => {
    expect(
      applicationSchema.safeParse({
        company: 'Acme',
        role: 'Engineer',
        stages: [
          stage,
          { ...stage, id: 'd8270544-8749-4a90-8bd9-361a8174a561' },
        ],
        totalRounds: 1,
      }).success,
    ).toBe(false);
  });
});
