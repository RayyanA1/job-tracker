import express from 'express';
import type { Pool } from 'pg';
import { fileURLToPath } from 'node:url';
import { logger } from './utils/logger.ts';
import { createApplicationsRouter } from './applications/routes.ts';
import { createApplicationsRepository } from './applications/repository.ts';
import { createCvRouter } from './cvs/routes.ts';
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
  app.use('/api/cvs', createCvRouter(pool, owner));
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
  app.use(
    (
      err: Error & { status?: number },
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      logger.error(err);
      res.status(err.status ?? 500).json({
        error:
          err.status === 400
            ? 'Invalid JSON'
            : 'Unable to save or load data. Please try again.',
      });
    },
  );
  return app;
}
