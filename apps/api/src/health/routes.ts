import { Router } from 'express';
export function createHealthRouter(checkDatabase: () => Promise<unknown>) {
  const router = Router();
  router.get('/', async (_req, res) => {
    await checkDatabase();
    res.json({ ok: true });
  });
  return router;
}
