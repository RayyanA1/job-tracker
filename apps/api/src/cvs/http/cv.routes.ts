import express, { Router } from 'express';
import { CvError } from '../cv.errors.ts';
import type { createCvAttachmentRepository } from '../persistence/cv-attachment.repository.ts';
import type { loadProfile } from '../persistence/cv-profile.store.ts';
import type { CvVersionRepository } from '../persistence/cv-version.repository.ts';
import type { createCvDraftService } from '../services/cv-draft.service.ts';
import type { createCvLibraryService } from '../services/cv-library.service.ts';
import type { createJobPostingImporter } from '../services/job-posting.service.ts';
import { handleCvError } from './cv-error-handler.ts';
import {
  attachmentSchema,
  cvIdSchema,
  draftSchema,
  pdfNameSchema,
  postingSchema,
  validated,
} from './cv.schemas.ts';

type Dependencies = {
  versions: Pick<CvVersionRepository, 'list'>;
  loadProfile: () => ReturnType<typeof loadProfile>;
  importPosting: ReturnType<typeof createJobPostingImporter>;
  createDraft: ReturnType<typeof createCvDraftService>;
  library: ReturnType<typeof createCvLibraryService>;
  attachments: ReturnType<typeof createCvAttachmentRepository>;
};

export function createCvRouter({
  versions,
  loadProfile,
  importPosting,
  createDraft,
  library,
  attachments,
}: Dependencies) {
  const router = Router();
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'private, no-store');
    next();
  });
  router.get('/', async (_req, res) => {
    res.json(await versions.list());
  });
  router.get('/profile', async (_req, res) => {
    res.json(await loadProfile());
  });
  router.post('/posting', async (req, res) => {
    const { url } = validated(postingSchema, req.body);
    res.json(await importPosting(url));
  });
  router.post('/drafts', async (req, res) => {
    const job = validated(draftSchema, req.body);
    res.status(201).json(await createDraft(job));
  });
  router.post(
    '/import',
    express.raw({ type: 'application/pdf', limit: '10mb' }),
    async (req, res) => {
      const name = validated(pdfNameSchema, req.query.name);
      if (
        !Buffer.isBuffer(req.body) ||
        req.body.subarray(0, 5).toString() !== '%PDF-' ||
        !req.body.subarray(-1024).includes('%%EOF')
      ) {
        throw new CvError('invalid-input', 'Choose a PDF file.');
      }
      res.status(201).json(await library.importPdf(name, req.body));
    },
  );
  router.post('/drafts/:id/save', async (req, res) => {
    res.json(await library.save(validated(cvIdSchema, req.params.id)));
  });
  router.get('/applications/:id', async (req, res) => {
    res.json(await attachments.attached(validated(cvIdSchema, req.params.id)));
  });
  router.put('/applications/:id', async (req, res) => {
    const { cvId } = validated(attachmentSchema, req.body);
    await attachments.attach(validated(cvIdSchema, req.params.id), cvId);
    res.json({ ok: true });
  });
  router.get('/:id/pdf', async (req, res) => {
    const { bytes, name } = await library.getPdf(
      validated(cvIdSchema, req.params.id),
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

  router.use(handleCvError);
  return router;
}
