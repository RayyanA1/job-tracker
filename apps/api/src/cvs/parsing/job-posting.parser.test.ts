import { describe, expect, it } from 'vitest';
import { extractPosting } from './job-posting.parser.ts';

const url = 'https://example.com/jobs/example';

describe('job posting parser', () => {
  it('extracts structured job data and discards markup', () => {
    const html = `<script type="application/ld+json">{"@graph": [{"@type":"JobPosting","title":"Backend Engineer","description":"<p>Build &amp; maintain services.</p>","hiringOrganization":{"name":"Example"}}]}</script>`;
    expect(extractPosting(html, url)).toEqual({
      url,
      title: 'Backend Engineer',
      company: 'Example',
      description: 'Build & maintain services.',
    });
  });

  it('offers paste fallback for an unreadable page', () => {
    expect(() =>
      extractPosting('<main>Sign in to view this job</main>', url),
    ).toThrow('Paste the job description');
  });
});
