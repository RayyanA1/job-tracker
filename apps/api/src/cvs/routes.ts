import express, { Router, type ErrorRequestHandler } from 'express';
import { z } from 'zod';
import type { Pool } from 'pg';
import { buildDocument } from './generation.ts';
import { importPosting } from './postings.ts';
import { CvError, loadProfile } from './profile.ts';
import { createCvsRepository } from './repository.ts';

const httpUrl = z.url({ protocol: /^https?$/ }).max(4_000);
const jobSchema = z.object({
  url: z.union([httpUrl, z.literal('')]),
  company: z.string().trim().max(200),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(30_000),
});

function validated<T>(schema: z.ZodType<T>, input: unknown) {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new CvError(
      400,
      result.error.issues
        .map(({ path, message }) =>
          path.length ? `${path.join('.')}: ${message}` : message,
        )
        .join('. '),
    );
  return result.data;
}

function nameFor(title: string, company = '') {
  return [title, company]
    .filter(Boolean)
    .join(' - ')
    .replace(/[\u0000-\u001f\u007f/\\]/g, '-')
    .slice(0, 160);
}

export function createCvRouter(pool: Pool, owner: string) {
  const router = Router();
  const repository = createCvsRepository(pool, owner);
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'private, no-store');
    next();
  });
  router.get('/', async (_req, res) => {
    res.json(await repository.list());
  });
  router.post('/posting', async (req, res) => {
    const { url } = validated(z.object({ url: httpUrl }), req.body);
    res.json(await importPosting(url));
  });
  router.post('/drafts', async (req, res) => {
    const job = validated(jobSchema, req.body);
    const profile = await loadProfile(owner);
    const document = await buildDocument(profile, job);
    const draft = await repository.draft(
      {
        kind: 'generated',
        name: nameFor(job.title, job.company),
        title: job.title,
        company: job.company,
        url: job.url,
      },
      document,
    );
    res.status(201).json(draft);
  });
  router.post(
    '/import',
    express.raw({ type: 'application/pdf', limit: '10mb' }),
    async (req, res) => {
      const name = validated(z.string().trim().min(1).max(255), req.query.name);
      if (
        !Buffer.isBuffer(req.body) ||
        req.body.subarray(0, 5).toString() !== '%PDF-' ||
        !req.body.subarray(-1024).includes('%%EOF')
      ) {
        throw new CvError(400, 'Choose a PDF file.');
      }
      const cv = await repository.import(
        nameFor(name.replace(/\.pdf$/i, '')) || 'Imported CV',
        req.body,
      );
      res.status(201).json(cv);
    },
  );
  router.post('/drafts/:id/save', async (req, res) => {
    res.json(await repository.save(validated(z.uuid(), req.params.id)));
  });
  router.get('/applications/:id', async (req, res) => {
    res.json(await repository.attached(validated(z.uuid(), req.params.id)));
  });
  router.put('/applications/:id', async (req, res) => {
    const { cvId } = validated(
      z.object({ cvId: z.uuid().nullable() }),
      req.body,
    );
    await repository.attach(validated(z.uuid(), req.params.id), cvId);
    res.json({ ok: true });
  });
  router.get('/:id/pdf', async (req, res) => {
    const { bytes, name } = await repository.pdf(
      validated(z.uuid(), req.params.id),
    );
    res.set('X-Content-Type-Options', 'nosniff');
    res.attachment(`${name}.pdf`);
    if (req.query.download !== '1') {
      res.set(
        'Content-Disposition',
        res.get('Content-Disposition')!.replace(/^attachment/, 'inline'),
      );
    }
    res.type('application/pdf').send(bytes);
  });

  const errors: ErrorRequestHandler = (error, _req, res, next) => {
    if (error instanceof CvError) {
      res.status(error.status).json({ error: error.message });
    } else if (error.status === 413) {
      res.status(413).json({ error: 'Choose a PDF under 10 MB.' });
    } else {
      next(error);
    }
  };
  router.use(errors);
  return router;
}
