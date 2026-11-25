import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { CvDocument } from '@tracker/shared';
import { describe, expect, it, vi } from 'vitest';
import { json, startApi } from '../../app.test-helpers.ts';

describe('composed CV routes', () => {
  const applicationId = '5c060de1-f664-43d1-bad1-eec385674425';
  const cvId = '56e14a38-a465-49e5-80e4-2dab02063e3c';
  const metadata = {
    kind: 'generated',
    name: 'Engineer - Acme',
    company: 'Acme',
    title: 'Engineer',
    url: '',
  };
  const created_at = new Date('2026-01-01T00:00:00Z');

  it('writes a draft before marking it saved and can save it again', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'cv-save-'));
    vi.stubEnv('CV_PDF_DIR', directory);
    const path = join(directory, 'local', 'pdfs', `${cvId}.pdf`);
    const document: CvDocument = {
      name: 'Example Candidate',
      headline: 'Engineer',
      contact: [],
      links: '',
      summary: [],
      skills: [],
      experience: [],
      projects: [],
      education: [],
    };
    const row = { id: cvId, metadata, created_at, document, saved: false };
    const query = vi.fn(async (sql: string) => {
      if (sql.includes('FOR UPDATE')) return { rows: [{ ...row }] };
      if (sql.startsWith('UPDATE')) {
        expect((await readFile(path)).subarray(0, 5).toString()).toBe('%PDF-');
        row.saved = true;
      }
      return { rows: [] };
    });
    const release = vi.fn();
    try {
      const request = await startApi(
        vi.fn(),
        vi.fn().mockResolvedValue({ query, release }),
      );
      const save = () =>
        request(`/cvs/drafts/${cvId}/save`, { method: 'POST' });
      const first = await save();
      const second = await save();
      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      const expected = {
        id: cvId,
        ...metadata,
        createdAt: created_at.toISOString(),
      };
      expect(await first.json()).toEqual(expected);
      expect(await second.json()).toEqual(expected);
      expect(query.mock.calls.map(([sql]) => sql)).toEqual([
        'BEGIN',
        expect.stringContaining('FOR UPDATE'),
        expect.stringContaining('SET saved=true'),
        'COMMIT',
        'BEGIN',
        expect.stringContaining('FOR UPDATE'),
        'COMMIT',
      ]);
      expect(release).toHaveBeenCalledTimes(2);
    } finally {
      vi.unstubAllEnvs();
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('retrieves an existing PDF and keeps the CV attachment contract', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'cv-library-'));
    vi.stubEnv('CV_PROFILE_DIR', directory);
    vi.stubEnv('CV_PDF_DIR', '');
    const pdfDirectory = join(directory, 'local', 'pdfs');
    const bytes = Buffer.from('%PDF-1.7\n%%EOF');
    try {
      await mkdir(pdfDirectory, { recursive: true });
      await writeFile(join(pdfDirectory, `${cvId}.pdf`), bytes);
      const row = {
        id: cvId,
        metadata,
        created_at,
        document: null,
        saved: true,
      };
      const query = vi
        .fn()
        .mockResolvedValueOnce({ rows: [row] })
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rows: [row] })
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rows: [] });
      const request = await startApi(query);
      const pdf = await request(`/cvs/${cvId}/pdf`);
      expect(pdf.status).toBe(200);
      expect(pdf.headers.get('content-disposition')).toBe(
        'inline; filename="Engineer - Acme.pdf"',
      );
      expect(pdf.headers.get('cache-control')).toBe('private, no-store');
      expect(Buffer.from(await pdf.arrayBuffer())).toEqual(bytes);
      const attachment = `/cvs/applications/${applicationId}`;
      const attached = await request(attachment, json('PUT', { cvId }));
      expect(attached.status).toBe(200);
      expect(await attached.json()).toEqual({ ok: true });
      expect(query.mock.calls[1]).toEqual([
        expect.stringContaining('AND cv.saved'),
        [applicationId, 'local', cvId],
      ]);
      expect(await (await request(attachment)).json()).toMatchObject({
        id: cvId,
        ...metadata,
      });
      expect(
        (await request(attachment, json('PUT', { cvId: null }))).status,
      ).toBe(200);
      expect(await (await request(attachment)).json()).toBeNull();
    } finally {
      vi.unstubAllEnvs();
      await rm(directory, { recursive: true, force: true });
    }
  });
});
