import { afterEach, expect, it, vi } from 'vitest';
import { applicationsApi } from './applications';
afterEach(() => vi.unstubAllGlobals());
it('uses the shared client for list and create requests', async () => {
  const fetchMock = vi
    .fn()
    .mockImplementation(
      async () => new Response(JSON.stringify({ id: 'example' })),
    );
  vi.stubGlobal('fetch', fetchMock);
  await applicationsApi.list();
  await applicationsApi.create({ company: 'Acme', role: 'Engineer' });
  expect(fetchMock.mock.calls[0]).toEqual([
    '/api/applications',
    expect.objectContaining({ method: 'GET' }),
  ]);
  expect(fetchMock.mock.calls[1]).toEqual([
    '/api/applications',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ company: 'Acme', role: 'Engineer' }),
    }),
  ]);
});
it('surfaces API error messages to the caller', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Application not found' }), {
        status: 404,
      }),
    ),
  );
  await expect(applicationsApi.list()).rejects.toThrow('Application not found');
});
