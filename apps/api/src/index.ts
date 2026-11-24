import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.ts';
import { createPool, initializeDatabase } from './db/index.ts';
import { logger } from './utils/logger.ts';
try {
  loadEnvFile(fileURLToPath(new URL('../../../.env', import.meta.url)));
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}
const pool = createPool();
await initializeDatabase(pool);
const app = createApp(pool);
const server = app.listen(Number(process.env['PORT'] ?? 3001), '0.0.0.0', () =>
  logger.info('Tracker running on http://localhost:3001'),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    server.close(() => {
      void pool.end().then(() => process.exit(0));
    });
  });
