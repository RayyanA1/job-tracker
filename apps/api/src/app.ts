import express from 'express';
import type { Pool } from 'pg';
import { fileURLToPath } from 'node:url';
import { handleApiError } from './http/error-handler.ts';
import { createApplicationsRouter } from './applications/http/application.routes.ts';
import { createApplicationsRepository } from './applications/persistence/application.repository.ts';
import {
  createGeminiGenerator,
  generateWithGemini,
} from './cvs/clients/gemini.client.ts';
import { createCvRouter } from './cvs/http/cv.routes.ts';
import { createCvAttachmentRepository } from './cvs/persistence/cv-attachment.repository.ts';
import { createCvPdfStore } from './cvs/persistence/cv-pdf.store.ts';
import { loadProfile } from './cvs/persistence/cv-profile.store.ts';
import { createCvVersionRepository } from './cvs/persistence/cv-version.repository.ts';
import { createCvDraftService } from './cvs/services/cv-draft.service.ts';
import { createCvLibraryService } from './cvs/services/cv-library.service.ts';
import { createJobPostingImporter } from './cvs/services/job-posting.service.ts';
import { createHealthRouter } from './health/routes.ts';
export function createApp(pool: Pool) {
  const app = express();
  const owner = 'local';
  app.use(express.json({ limit: '5mb' }));
  app.use(
    '/api/health',
    createHealthRouter(() => pool.query('SELECT 1')),
  );
  app.use(
    '/api/applications',
    createApplicationsRouter(createApplicationsRepository(pool, owner)),
  );
  const versions = createCvVersionRepository(pool, owner);
  const loadOwnerProfile = () => loadProfile(owner);
  const defaultPostingModel = 'gemini-3.1-flash-lite';
  const postingModel =
    process.env.GEMINI_POSTING_MODEL?.trim() || defaultPostingModel;
  app.use(
    '/api/cvs',
    createCvRouter({
      versions,
      loadProfile: loadOwnerProfile,
      importPosting: createJobPostingImporter({
        generate: createGeminiGenerator({
          model: postingModel,
          maxOutputTokens: 12_288,
          thinkingLevel:
            postingModel === defaultPostingModel ? 'MINIMAL' : undefined,
        }),
      }),
      createDraft: createCvDraftService({
        loadProfile: loadOwnerProfile,
        generate: generateWithGemini,
        versions,
      }),
      library: createCvLibraryService(versions, createCvPdfStore(owner)),
      attachments: createCvAttachmentRepository(pool, owner),
    }),
  );
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });
  app.use(
    express.static(fileURLToPath(new URL('../../web/dist', import.meta.url))),
  );
  app.get('/{*path}', (_req, res) =>
    res.sendFile(
      fileURLToPath(new URL('../../web/dist/index.html', import.meta.url)),
    ),
  );
  app.use(handleApiError);
  return app;
}
