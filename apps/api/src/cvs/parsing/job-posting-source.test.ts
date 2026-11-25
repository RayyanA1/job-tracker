import { describe, expect, it } from 'vitest';
import { preparePostingSource } from './job-posting-source.ts';

describe('job posting source', () => {
  it('includes visible text and JobPosting data without unrelated markup', () => {
    const source = preparePostingSource(`
      <title>Careers</title>
      <meta property="og:site_name" content="Example Careers">
      <nav>Browse openings</nav>
      <script type="application/ld+json">{invalid}</script>
      <script type="application/ld+json">
        {"@graph":[{"@type":"Organization","name":"Unrelated"},
        {"@type":"JobPosting","title":"Backend Engineer",
        "description":"<p>Build &amp; maintain services.</p>",
        "hiringOrganization":{"name":"Example"}}]}
      </script>
      <div><h1>Backend Engineer</h1><p>Applications open</p></div>
      <script>window.analytics = 'noise';</script>
    `);

    expect(source.pageText).toContain('Careers');
    expect(source.siteName).toBe('Example Careers');
    expect(source.pageText).toContain('Applications open');
    expect(source.pageText).not.toMatch(/Browse openings|analytics|@graph/);
    expect(source.structured).toContain('Backend Engineer');
    expect(source.structured).toContain('Example');
    expect(source.structured).toContain('Build & maintain services.');
    expect(source.structured).not.toContain('Unrelated');
  });

  it('bounds both types of source material', () => {
    const longText = 'x'.repeat(100_000);
    const source = preparePostingSource(`
      <div>${longText}</div>
      <script type="application/ld+json">
        {"@type":"JobPosting","description":"${longText}"}
      </script>
    `);
    expect(source.pageText).toHaveLength(48_000);
    expect(source.structured).toHaveLength(32_000);
  });
});
