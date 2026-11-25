import { Router } from 'express';
import type { RequestHandler } from 'express';
import { applicationSchema } from '@tracker/shared';
import type { ApplicationsRepository } from '../persistence/application.repository.ts';
import { formatValidationIssues } from '../../http/validation.ts';

const validateId: RequestHandler = (req, res, next) => {
  if (!/^[0-9a-f-]{36}$/i.test(String(req.params['id']))) {
    res.status(400).json({ error: 'Invalid application ID' });
    return;
  }
  next();
};
const validateApplication: RequestHandler = (req, res, next) => {
  const parsed = applicationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: formatValidationIssues(parsed.error.issues, {
        separator: '; ',
        includeEmptyPath: true,
      }),
    });
    return;
  }
  req.body = parsed.data;
  next();
};
export function createApplicationsRouter(repository: ApplicationsRepository) {
  const router = Router();
  router.get('/', async (_req, res) => {
    res.json(await repository.list());
  });
  router.get('/:id', validateId, async (req, res) => {
    const application = await repository.find(String(req.params.id));
    if (!application) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }
    res.json(application);
  });
  router.post('/', validateApplication, async (req, res) => {
    res.status(201).json(await repository.create(req.body));
  });
  router.put('/:id', validateId, validateApplication, async (req, res) => {
    const application = await repository.update(
      String(req.params.id),
      req.body,
    );
    if (!application) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }
    res.json(application);
  });
  return router;
}
