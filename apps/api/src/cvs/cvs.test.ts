import { readFile } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import { buildDocument } from './generation.ts';
import { extractPosting, publicAddress } from './postings.ts';
import { parseProfile } from './profile.ts';
import { renderCv } from './pdf.ts';

const profile = parseProfile(`
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
`);
const job = {
  url: 'https://example.com/jobs/example',
  description: 'Senior AWS Engineer using AWS and TypeScript',
  title: 'Senior AWS Engineer',
  company: 'Applicant Inc',
};

describe('profile and CV generation', () => {
  it('allows copying the blank Markdown template without treating placeholders as facts', async () => {
    const template = await readFile(
      new URL('../../../../cv-profile.template.md', import.meta.url),
      'utf8',
    );
    expect(parseProfile(template)).toMatchObject({
      name: '',
      headlines: [],
      entries: [],
    });
  });

  it('refuses a skill suggested by the job that has no profile source', async () => {
    const generate = vi
      .fn()
      .mockResolvedValue({
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
