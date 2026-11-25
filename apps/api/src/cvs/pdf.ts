import PDFDocument from 'pdfkit';
import type { CvBullet, CvDocument } from '@tracker/shared';
import { CvError } from './profile.ts';

const dark = '#182330';
const teal = '#008783';
const margin = 40;

export function renderCv(cv: CvDocument) {
  const pdf = new PDFDocument({
    size: 'A4',
    margins: { top: 20, bottom: margin, left: margin, right: margin },
    info: { Title: `${cv.name} - CV`, Author: cv.name },
  });
  let pages = 1;
  const chunks: Buffer[] = [];
  const output = new Promise<{ bytes: Buffer; pages: number }>(
    (resolve, reject) => {
      pdf.on('pageAdded', () => pages++);
      pdf.on('data', (chunk: Buffer) => chunks.push(chunk));
      pdf.on('error', reject);
      pdf.on('end', () => resolve({ bytes: Buffer.concat(chunks), pages }));
    },
  );
  const right = pdf.page.width - margin;
  const width = right - margin;
  function ensure(height: number) {
    if (pdf.y + height > pdf.page.height - margin) pdf.addPage();
  }
  function heading(title: string) {
    ensure(43);
    pdf
      .moveDown(0.6)
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(teal)
      .text(title, margin, pdf.y);
    pdf
      .moveTo(margin, pdf.y + 3)
      .lineTo(right, pdf.y + 3)
      .lineWidth(0.5)
      .stroke('#aab7c5');
    pdf.y += 10;
    pdf.font('Helvetica').fontSize(10).fillColor(dark);
  }
  const bulletWidth = width - 15;
  const bulletText = (item: CvBullet) =>
    item.project ? `${item.project}: ${item.claim.text}` : item.claim.text;
  function bulletHeight(item: CvBullet) {
    pdf.font('Helvetica').fontSize(10);
    return pdf.heightOfString(bulletText(item), { width: bulletWidth }) + 4;
  }
  function bullet(item: CvBullet) {
    ensure(bulletHeight(item));
    pdf.text('•', margin + 2, pdf.y, { lineBreak: false });
    pdf.text(bulletText(item), margin + 15, pdf.y, { width: bulletWidth });
    pdf.y += 4;
  }

  pdf
    .fillColor(dark)
    .font('Helvetica-Bold')
    .fontSize(27)
    .text(cv.name.toUpperCase());
  pdf
    .moveDown(0.2)
    .fillColor(teal)
    .font('Helvetica')
    .fontSize(13)
    .text(cv.headline);
  pdf.moveDown(0.35).fillColor('#415266').fontSize(10);
  if (cv.contact.length) pdf.text(cv.contact.join(' · '));
  if (cv.links) pdf.text(cv.links);
  pdf.moveDown(1).fillColor(dark);

  if (cv.summary.length) pdf.text(cv.summary.map(({ text }) => text).join(' '));
  if (cv.skills.length) {
    heading('SKILLS');
    pdf.text(cv.skills.join(' · '));
  }
  if (cv.experience.length) heading('EXPERIENCE');
  for (const role of cv.experience) {
    pdf.font('Helvetica-Bold').fontSize(11);
    const employerHeight = pdf.heightOfString(role.employer, { width });
    pdf.font('Helvetica').fontSize(10);
    const dateWidth = Math.min(pdf.widthOfString(role.dates) + 5, width / 2);
    const dateHeight = pdf.heightOfString(role.dates, { width: dateWidth });
    const titleWidth = width - dateWidth - 10;
    const titleHeight = pdf
      .font('Helvetica-Oblique')
      .heightOfString(role.title, { width: titleWidth });
    const headerHeight = employerHeight + Math.max(dateHeight, titleHeight) + 5;
    const bulletsHeight = role.bullets.reduce(
      (total, item) => total + bulletHeight(item),
      0,
    );
    const pageHeight =
      pdf.page.height - pdf.page.margins.top - pdf.page.margins.bottom;
    const firstBullet = role.bullets[0] ? bulletHeight(role.bullets[0]) : 0;
    const roleHeight = headerHeight + bulletsHeight;
    ensure(
      roleHeight <= pageHeight
        ? roleHeight
        : Math.min(headerHeight + firstBullet, pageHeight),
    );
    pdf.font('Helvetica-Bold').fontSize(11).text(role.employer, margin, pdf.y);
    const y = pdf.y;
    pdf.font('Helvetica').fontSize(10);
    pdf.text(role.dates, right - dateWidth, y, {
      width: dateWidth,
      align: 'right',
    });
    const dateBottom = pdf.y;
    pdf
      .font('Helvetica-Oblique')
      .text(role.title, margin, y, { width: titleWidth });
    pdf.y = Math.max(pdf.y, dateBottom) + 5;
    role.bullets.forEach(bullet);
    pdf.moveDown(0.45);
  }
  if (cv.projects.length) {
    heading('PROJECTS');
    cv.projects.forEach(bullet);
  }
  if (cv.education.length) {
    heading('EDUCATION');
    cv.education.forEach((entry) =>
      pdf.text(entry, margin, pdf.y, { paragraphGap: 4 }),
    );
  }
  pdf.end();
  return output;
}

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
      422,
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
