import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { buildDocument } from './generation.ts';
import { extractPosting, publicAddress } from './postings.ts';
import {
  loadProfile,
  parseLegacyProfile,
  parseProfileJson,
} from './profile.ts';
import { renderCv } from './pdf.ts';

const legacyProfile = `
## Identity
- Name: Example Candidate
- Email: private@example.com

## Professional profile
- Supported CV headlines: Software Engineer | Backend Engineer
- Background: Develops internal tooling.

## Skills
- [typescript] TypeScript
  - Evidence: latency

## Career history
### [role] Example Company
- Official title: Software Engineer
- Dates: 2022 - Present

#### [latency] Search performance
- Contribution: Improved search performance using TypeScript.
- Metric: Reduced median latency by 15%.
- Skills: typescript

## Projects
### [tool] Example Tool
- Associated role: role
- Contribution: Built a reporting tool.
`;
const profile = parseProfileJson(
  JSON.stringify(parseLegacyProfile(legacyProfile)),
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

  it('migrates legacy facts and keeps the JSON authoritative for each owner', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'cv-profile-'));
    vi.stubEnv('CV_PROFILE_DIR', directory);
    try {
      const owner = join(directory, 'first');
      await mkdir(owner);
      const legacyPath = join(owner, 'profile.md');
      const jsonPath = join(owner, 'profile.json');
      await writeFile(legacyPath, legacyProfile);
      const results = await Promise.all([
        loadProfile('first'),
        loadProfile('first'),
      ]);
      expect(results).toEqual([profile, profile]);
      expect(await readFile(legacyPath, 'utf8')).toBe(legacyProfile);
      expect(parseProfileJson(await readFile(jsonPath, 'utf8'))).toEqual(
        profile,
      );
      expect(profile.entries).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'typescript', evidence: ['latency'] }),
          expect.objectContaining({
            id: 'latency',
            roleId: 'role',
            skills: ['typescript'],
          }),
          expect.objectContaining({ id: 'tool', roleId: 'role' }),
        ]),
      );
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

describe('job posting import', () => {
  it('extracts structured job data and discards markup', () => {
    const html = `<script type="application/ld+json">{"@graph": [{"@type":"JobPosting","title":"Backend Engineer","description":"<p>Build &amp; maintain services.</p>","hiringOrganization":{"name":"Example"}}]}</script>`;
    expect(extractPosting(html, job.url)).toEqual({
      url: job.url,
      title: 'Backend Engineer',
      company: 'Example',
      description: 'Build & maintain services.',
    });
  });

  it('offers paste fallback for an unreadable page', () => {
    expect(() =>
      extractPosting('<main>Sign in to view this job</main>', job.url),
    ).toThrow('Paste the job description');
  });

  it.each([
    '127.0.0.1',
    '169.254.1.2',
    '192.168.10.10',
    '::1',
    '::ffff:10.12.13.14',
    'fe80::1',
    '64:ff9b::1',
  ])('blocks non-public network address %s', (address) => {
    expect(publicAddress(address)).toBe(false);
  });
});
