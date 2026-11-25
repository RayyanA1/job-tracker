import type { CvProfile, JobPosting } from '@tracker/shared';
import type { Generate } from '../clients/gemini.client.ts';
import type { CvVersionRepository } from '../persistence/cv-version.repository.ts';
import { fitCv } from '../rendering/cv-pdf-fit.ts';
import { cvFilename } from './cv-filename.ts';
import { buildDocument } from './cv-generation.ts';

type Dependencies = {
  loadProfile: () => Promise<CvProfile>;
  generate: Generate;
  versions: Pick<CvVersionRepository, 'insert'>;
};

export function createCvDraftService({
  loadProfile,
  generate,
  versions,
}: Dependencies) {
  return async function createDraft(job: JobPosting) {
    const profile = await loadProfile();
    const document = await buildDocument(profile, job, generate);
    const fitted = await fitCv(document);
    const { id } = await versions.insert(
      {
        kind: 'generated',
        name: cvFilename(job.title, job.company),
        title: job.title,
        company: job.company,
        url: job.url,
      },
      fitted.document,
    );
    return { id, document: fitted.document, trimmed: fitted.trimmed };
  };
}
