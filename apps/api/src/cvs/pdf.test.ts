import { describe, expect, it } from 'vitest';
import type { CvBullet, CvDocument } from '@tracker/shared';
import { fitCv, renderCv } from './pdf.ts';

function bullet(priority: number): CvBullet {
  return {
    priority,
    claim: {
      text:
        `Achievement ${priority}. ` +
        'Improved reporting and made it easier for teams to track their weekly work. '.repeat(
          7,
        ),
      sources: [],
    },
  };
}

const longCv: CvDocument = {
  name: 'Morgan Example',
  contact: ['London, UK', 'morgan@example.com'],
  links: '',
  headline: 'Backend Engineer',
  summary: [],
  skills: ['TypeScript', 'Postgres'],
  experience: Array.from({ length: 7 }, (_, index) => ({
    employer: `Example Company ${index + 1}`,
    title: 'Software Engineer',
    dates: `${2020 + index}`,
    bullets: [bullet(index + 2), bullet(index + 9)],
  })),
  projects: [
    { ...bullet(0), project: 'Reporting Tool' },
    { ...bullet(16), project: 'Internal Dashboard' },
  ],
  education: ['Example University · Computer Science'],
};

describe('one-page generated CVs', () => {
  it('drops the least relevant entries across sections and preserves the timeline and education', async () => {
    expect((await renderCv(longCv)).pages).toBeGreaterThan(1);
    const fitted = await fitCv(longCv);
    expect(fitted.trimmed).toBe(true);
    expect((await renderCv(fitted.document)).pages).toBe(1);
    expect(
      fitted.document.experience.map(({ employer, title, dates }) => ({
        employer,
        title,
        dates,
      })),
    ).toEqual(
      longCv.experience.map(({ employer, title, dates }) => ({
        employer,
        title,
        dates,
      })),
    );
    expect(fitted.document.education).toEqual(longCv.education);
    expect(fitted.document.projects.map(({ project }) => project)).toEqual([
      'Reporting Tool',
    ]);
    expect(fitted.document.experience[6]!.bullets).toEqual([]);
    expect(longCv.projects).toHaveLength(2);
    expect(await fitCv(fitted.document)).toMatchObject({
      document: fitted.document,
      trimmed: false,
    });
  });

  it('rejects a draft when the required details alone exceed one page', async () => {
    const role = { ...longCv.experience[0]!, bullets: [] };
    const overcrowded = {
      ...longCv,
      experience: Array.from({ length: 40 }, () => role),
      projects: [],
    };
    await expect(fitCv(overcrowded)).rejects.toMatchObject({
      status: 422,
      message: expect.stringContaining('Shorten long entries in your profile'),
    });
  });
});
