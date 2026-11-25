import type { CvDocument } from '@tracker/shared';
import { CvError } from '../cv.errors.ts';
import { renderCv } from './cv-pdf.renderer.ts';

export async function fitCv(document: CvDocument) {
  let rendered = await renderCv(document);
  if (rendered.pages === 1)
    return { document, bytes: rendered.bytes, trimmed: false };

  const fitted: CvDocument = {
    ...document,
    experience: document.experience.map((role) => ({ ...role, bullets: [] })),
    projects: [],
    summary: [],
    skills: [],
  };
  const core = await renderCv(fitted);
  if (core.pages !== 1) {
    throw new CvError(
      'invalid-content',
      'Your contact details, headline, career history and education exceed one A4 page. Shorten long entries in your profile, then generate a new CV.',
    );
  }

  const ranked = [
    ...document.experience.flatMap(({ bullets }) => bullets),
    ...document.projects,
  ].sort(
    (a, b) =>
      (a.priority ?? Number.MAX_SAFE_INTEGER) -
      (b.priority ?? Number.MAX_SAFE_INTEGER),
  );
  const kept = new Set(ranked);
  fitted.summary = [...document.summary];
  fitted.skills = [...document.skills];
  while (rendered.pages > 1) {
    const bullet = ranked.pop();
    if (bullet) {
      kept.delete(bullet);
      fitted.experience = document.experience.map((role) => ({
        ...role,
        bullets: role.bullets.filter((item) => kept.has(item)),
      }));
      fitted.projects = document.projects.filter((item) => kept.has(item));
    } else if (fitted.summary.length) {
      fitted.summary.pop();
    } else {
      fitted.skills.pop();
    }
    rendered = await renderCv(fitted);
  }
  return { document: fitted, bytes: rendered.bytes, trimmed: true };
}
