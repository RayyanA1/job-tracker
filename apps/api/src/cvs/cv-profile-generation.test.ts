import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { buildDocument } from './services/cv-generation.ts';
import { parseProfileJson } from './entities/cv-profile.entity.ts';
import { loadProfile } from './persistence/cv-profile.store.ts';
import { renderCv } from './rendering/cv-pdf.renderer.ts';

const profile = parseProfileJson(
  JSON.stringify({
    name: 'Example Candidate',
    email: 'private@example.com',
    headlines: ['Software Engineer', 'Backend Engineer'],
    background: 'Develops internal tooling.',
    entries: [
      {
        id: 'typescript',
        name: 'TypeScript',
        kind: 'skill',
        evidence: ['latency'],
      },
      {
        id: 'role',
        name: 'Example Company',
        kind: 'role',
        fields: {
          'Official title': 'Software Engineer',
          Dates: '2022 - Present',
        },
      },
      {
        id: 'latency',
        name: 'Search performance',
        kind: 'achievement',
        roleId: 'role',
        fields: {
          Contribution: 'Improved search performance using TypeScript.',
          Metric: 'Reduced median latency by 15%.',
        },
        skills: ['typescript'],
      },
      {
        id: 'tool',
        name: 'Example Tool',
        kind: 'project',
        roleId: 'role',
        fields: { Contribution: 'Built a reporting tool.' },
      },
    ],
  }),
);
const job = {
  url: 'https://example.com/jobs/example',
  description: 'Senior AWS Engineer using AWS and TypeScript',
  title: 'Senior AWS Engineer',
  company: 'Applicant Inc',
};

describe('profile and CV generation', () => {
  it('loads the blank JSON template without introducing any facts', async () => {
    const template = await readFile(
      new URL('../../../../cv-profile.template.json', import.meta.url),
      'utf8',
    );
    expect(parseProfileJson(template)).toMatchObject({
      name: '',
      headlines: [],
      entries: [],
    });
  });

  it('initializes and loads the JSON profile for each owner', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'cv-profile-'));
    vi.stubEnv('CV_PROFILE_DIR', directory);
    try {
      const jsonPath = join(directory, 'first', 'profile.json');
      const [first, concurrent] = await Promise.all([
        loadProfile('first'),
        loadProfile('first'),
      ]);
      expect(first).toMatchObject({ name: '', headlines: [], entries: [] });
      expect(concurrent).toEqual(first);
      expect(JSON.parse(await readFile(jsonPath, 'utf8'))).toEqual(first);
      await writeFile(
        jsonPath,
        JSON.stringify({ ...profile, name: 'Edited Name' }),
      );
      expect(await loadProfile('first')).toMatchObject({ name: 'Edited Name' });
      expect(await loadProfile('second')).toMatchObject({
        name: '',
        entries: [],
      });
      await writeFile(jsonPath, '{');
      await expect(loadProfile('first')).rejects.toThrow('invalid JSON');
    } finally {
      vi.unstubAllEnvs();
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('rejects invalid skill references in JSON', () => {
    expect(() =>
      parseProfileJson(
        JSON.stringify({
          entries: [
            {
              id: 'example',
              name: 'Example',
              kind: 'project',
              fields: { Contribution: 'Built a tool.' },
              skills: ['unknown'],
            },
          ],
        }),
      ),
    ).toThrow('unknown skill ID unknown');
  });

  it('refuses a skill suggested by the job that has no profile source', async () => {
    const generate = vi.fn().mockResolvedValue({
      headlineIndex: 0,
      skillIds: ['aws'],
      summary: [],
      bullets: [],
    });
    await expect(buildDocument(profile, job, generate)).rejects.toThrow(
      'outside your profile',
    );
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('preserves historical titles and replaces unsupported rewrites with profile wording', async () => {
    const generate = vi
      .fn()
      .mockResolvedValueOnce({
        headlineIndex: 1,
        skillIds: ['typescript'],
        summary: [{ text: 'Managed 3 teams.', sourceIds: ['background'] }],
        bullets: [
          { id: 'latency', text: 'Cut median latency by 85%.' },
          { id: 'tool', text: 'Built a reporting tool with Kubernetes.' },
        ],
      })
      .mockResolvedValueOnce({ supported: [false, true, false] });
    const result = await buildDocument(profile, job, generate);
    expect(result.headline).toBe('Backend Engineer');
    expect(result.summary).toEqual([]);
    expect(result.skills).toEqual(['TypeScript']);
    expect(result.experience[0]).toMatchObject({
      title: 'Software Engineer',
      bullets: [
        {
          claim: {
            text: 'Improved search performance using TypeScript. Reduced median latency by 15%.',
          },
        },
        { project: 'Example Tool', claim: { text: 'Built a reporting tool.' } },
      ],
    });
    expect(JSON.stringify(generate.mock.calls)).not.toContain(
      'private@example.com',
    );
    expect((await renderCv(result)).pages).toBe(1);
  });
});
