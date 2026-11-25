import { randomUUID } from 'node:crypto';
import { CvError } from '../cv.errors.ts';
import type { CvPdfStore } from '../persistence/cv-pdf.store.ts';
import type { CvVersionRepository } from '../persistence/cv-version.repository.ts';
import { fitCv } from '../rendering/cv-pdf-fit.ts';
import { cvFilename } from './cv-filename.ts';

const missingVersion = () => new CvError('not-found', 'CV version not found.');

export function createCvLibraryService(
  versions: Pick<CvVersionRepository, 'insert' | 'find' | 'withLockedVersion'>,
  pdfs: CvPdfStore,
) {
  return {
    async importPdf(filename: string, bytes: Buffer) {
      const id = randomUUID();
      const name = cvFilename(filename.replace(/\.pdf$/i, '')) || 'Imported CV';
      await pdfs.write(id, bytes);
      return versions.insert(
        { kind: 'imported', name, company: '', title: '', url: '' },
        null,
        id,
        true,
      );
    },
    async save(id: string) {
      return versions.withLockedVersion(id, async (stored, markSaved) => {
        if (!stored) throw missingVersion();
        if (!stored.saved) {
          if (!stored.document) throw missingVersion();
          const fitted = await fitCv(stored.document);
          await pdfs.write(id, fitted.bytes);
          await markSaved(fitted.document);
        }
        return stored.version;
      });
    },
    async getPdf(id: string) {
      const stored = await versions.find(id);
      if (!stored) throw missingVersion();
      const { version, saved, document } = stored;
      if (saved) {
        return { bytes: await pdfs.read(id), name: version.name };
      }
      if (!document) throw missingVersion();
      const { bytes } = await fitCv(document);
      return { bytes, name: version.name };
    },
  };
}
