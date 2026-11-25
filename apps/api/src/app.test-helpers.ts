import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Pool } from 'pg';
import { afterEach, type vi } from 'vitest';
import { createApp } from './app.ts';

let server: Server | undefined;
afterEach(async () => {
  if (server?.listening)
    await new Promise<void>((resolve, reject) =>
      server!.close((error) => (error ? reject(error) : resolve())),
    );
  server = undefined;
});
export async function startApi(
  query: ReturnType<typeof vi.fn>,
  connect?: ReturnType<typeof vi.fn>,
) {
  const app = createApp({ query, connect } as unknown as Pool);
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) =>
    server!.once('listening', resolve).once('error', reject),
  );
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return (path: string, options?: RequestInit) =>
    fetch(`${base}/api${path}`, options);
}
export const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
