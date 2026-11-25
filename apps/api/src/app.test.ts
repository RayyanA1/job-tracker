import { describe, expect, it, vi } from 'vitest';
import { json, startApi } from './app.test-helpers.ts';

const id = '5c060de1-f664-43d1-bad1-eec385674425';

describe('composed API routes', () => {
  it('checks the database through the health router', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const request = await startApi(query);
    const response = await request('/health');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(query).toHaveBeenCalledWith('SELECT 1');
  });
  it('creates with defaults and returns application metadata', async () => {
    const query = vi.fn().mockImplementation(async (_sql, values) => ({
      rows: [
        {
          id: values[0],
          data: values[1],
          updated_at: new Date('2026-01-01T00:00:00Z'),
        },
      ],
    }));
    const request = await startApi(query);
    const response = await request(
      '/applications',
      json('POST', { company: 'Acme', role: 'Engineer' }),
    );
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      company: 'Acme',
      role: 'Engineer',
      status: 'Applied',
      answers: [],
      stages: [],
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(query.mock.calls[0]![0]).toContain('INSERT INTO applications');
  });
  it('lists and retrieves stored records through the repository', async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [
        {
          id,
          data: { company: 'Acme', role: 'Engineer' },
          updated_at: new Date('2026-01-01T00:00:00Z'),
        },
      ],
    });
    const request = await startApi(query);
    const list = await request('/applications');
    expect(await list.json()).toEqual([
      expect.objectContaining({ id, company: 'Acme' }),
    ]);
    const detail = await request(`/applications/${id}`);
    expect(await detail.json()).toMatchObject({ id, role: 'Engineer' });
    expect(query.mock.calls[1]![1]).toEqual([id, 'local']);
  });
  it('rejects invalid payloads and IDs without calling the database', async () => {
    const query = vi.fn();
    const request = await startApi(query);
    expect(
      (await request('/applications', json('POST', { company: '' }))).status,
    ).toBe(400);
    expect((await request('/applications/bad-id')).status).toBe(400);
    expect(
      (await request(`/applications/${id}`, json('PUT', { company: 'Acme' })))
        .status,
    ).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });
  it('updates the entire validated record and handles missing records', async () => {
    const query = vi
      .fn()
      .mockImplementationOnce(async (_sql, values) => ({
        rows: [{ id: values[0], data: values[1], updated_at: new Date() }],
      }))
      .mockResolvedValue({ rows: [] });
    const request = await startApi(query);
    const response = await request(
      `/applications/${id}`,
      json('PUT', {
        company: 'Acme',
        role: 'Engineer',
        cvReference: 'cv-v2.pdf',
        answers: [{ id, question: 'Why?', answer: 'Meaningful work' }],
        currentStageId: id,
        stages: [
          {
            id,
            name: 'Technical',
            date: '',
            status: 'Planned',
            summary: 'Design',
            notes: 'Pasted notes\nMore notes',
          },
        ],
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      cvReference: 'cv-v2.pdf',
      answers: [expect.objectContaining({ answer: 'Meaningful work' })],
      stages: [expect.objectContaining({ notes: 'Pasted notes\nMore notes' })],
    });
    expect((await request(`/applications/${id}`)).status).toBe(404);
    expect(
      (
        await request(
          `/applications/${id}`,
          json('PUT', { company: 'Acme', role: 'Engineer' }),
        )
      ).status,
    ).toBe(404);
  });
  it('keeps unknown API routes and malformed JSON as JSON errors', async () => {
    const request = await startApi(vi.fn());
    expect((await request('/unknown')).status).toBe(404);
    const response = await request('/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{',
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid JSON' });
  });
});
