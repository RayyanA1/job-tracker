import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGeminiGenerator } from '../clients/gemini.client.ts';
import { createJobPostingImporter } from './job-posting.service.ts';

const url = 'https://example.com/jobs/backend';
const extraction = {
  found: true,
  company: '',
  title: 'Jurutera Data',
  description: 'Bina saluran data dengan Python.',
};

function setup(response: Response) {
  vi.stubEnv('GEMINI_API_KEY', 'test-key');
  vi.stubEnv('GEMINI_MODEL', 'draft-model');
  const fetchModel = vi.fn<typeof fetch>().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetchModel);
  const fetchPosting = vi.fn(
    async () =>
      `<div><h1>${extraction.title}</h1><p>${extraction.description}</p></div>`,
  );
  const importPosting = createJobPostingImporter({
    fetchPosting,
    generate: createGeminiGenerator({ model: 'posting-model' }),
  });
  return { fetchModel, fetchPosting, importPosting };
}

function modelResponse(result: unknown) {
  return Response.json({
    candidates: [{ content: { parts: [{ text: JSON.stringify(result) }] } }],
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('job posting import', () => {
  it('uses the posting model once with page content and returns the original URL', async () => {
    const { fetchModel, fetchPosting, importPosting } = setup(
      modelResponse(extraction),
    );
    await expect(importPosting(url)).resolves.toEqual({
      url,
      company: extraction.company,
      title: extraction.title,
      description: extraction.description,
    });

    expect(fetchPosting).toHaveBeenCalledExactlyOnceWith(url);
    expect(fetchModel).toHaveBeenCalledTimes(1);
    const [endpoint, request] = fetchModel.mock.calls[0]!;
    expect(endpoint).toEqual(
      expect.stringContaining('/posting-model:generateContent'),
    );
    const body = JSON.parse(String(request?.body));
    expect(body).not.toHaveProperty('tools');
    expect(body.contents[0].parts[0].text).toContain(extraction.description);
    expect(body.contents[0].parts[0].text).not.toContain(url);
    expect(body.generationConfig.responseMimeType).toBe('application/json');
  });

  it.each([
    { ...extraction, found: false },
    { ...extraction, description: '   ' },
  ])(
    'offers manual paste when the model finds no readable posting',
    async (result) => {
      const { importPosting } = setup(modelResponse(result));
      await expect(importPosting(url)).rejects.toMatchObject({
        code: 'invalid-content',
        message: expect.stringContaining('Paste the job description'),
      });
    },
  );

  it('rejects invalid model output and keeps the manual paste path', async () => {
    const { importPosting } = setup(
      modelResponse({ ...extraction, description: 'x'.repeat(30_001) }),
    );
    await expect(importPosting(url)).rejects.toMatchObject({
      code: 'provider-failed',
      message: expect.stringContaining('paste the job description'),
    });
  });

  it('preserves the rate-limit error without retrying', async () => {
    const { fetchModel, importPosting } = setup(
      new Response(null, { status: 429 }),
    );
    await expect(importPosting(url)).rejects.toMatchObject({
      code: 'provider-rate-limited',
      message: expect.stringContaining('paste the job description'),
    });
    expect(fetchModel).toHaveBeenCalledTimes(1);
  });
});
