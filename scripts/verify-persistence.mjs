import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
const base = 'http://localhost:3001/api';
async function request(path, method = 'GET', body) {
  const r = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', Connection: 'close' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  assert.ok(r.ok, await r.clone().text());
  return r.json();
}
let id;
try {
  const a = await request('/applications', 'POST', {
    company: 'Persistence verification',
    role: 'Software Engineer',
  });
  id = a.id;
  const stageId = randomUUID();
  const saved = await request(`/applications/${id}`, 'PUT', {
    ...a,
    cvReference: 'Rayyan_CV_v3.pdf',
    answers: [
      {
        id: randomUUID(),
        question: 'Why this company?',
        answer: 'I want to build useful, thoughtful products.',
      },
    ],
    stages: [
      {
        id: stageId,
        name: 'Technical interview',
        date: '2026-12-01',
        status: 'Scheduled',
        summary: 'Architecture and implementation.',
        notes:
          'Pasted ChatGPT notes:\n- Explain tradeoffs\n- Discuss testing and reliability',
      },
    ],
    currentStageId: stageId,
    totalRounds: 4,
    nextAction: 'Send availability',
    nextActionDate: '2026-11-25',
    rating: 4,
  });
  execFileSync('docker', ['compose', 'down'], { stdio: 'inherit' });
  execFileSync('docker', ['compose', 'up', '-d', '--wait'], {
    stdio: 'inherit',
  });
  const restored = await request(`/applications/${id}`);
  assert.deepEqual(restored, saved);
  assert.ok((await request('/applications')).some((x) => x.id === id));
  console.log(
    'PASS: application, CV reference, answer, interview notes, current stage, rating, and next action survived full app + database recreation.',
  );
} finally {
  if (id)
    execFileSync(
      'docker',
      [
        'compose',
        'exec',
        '-T',
        'db',
        'psql',
        '-U',
        'tracker',
        '-d',
        'tracker',
        '-c',
        `DELETE FROM applications WHERE id='${id}'`,
      ],
      { stdio: 'inherit' },
    );
}
