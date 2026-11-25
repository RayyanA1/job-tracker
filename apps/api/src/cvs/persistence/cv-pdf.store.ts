import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { CvError } from '../cv.errors.ts';
import { profileDirectory } from './cv-storage-paths.ts';

export function createCvPdfStore(owner: string) {
  const path = (id: string) =>
    join(
      process.env.CV_PDF_DIR
        ? join(process.env.CV_PDF_DIR, owner)
        : profileDirectory(owner),
      'pdfs',
      `${id}.pdf`,
    );

  return {
    async write(id: string, pdf: Buffer) {
      const destination = path(id);
      const temporary = `${destination}.${randomUUID()}.tmp`;
      await mkdir(dirname(destination), { recursive: true, mode: 0o700 });
      try {
        await writeFile(temporary, pdf, { mode: 0o600, flag: 'wx' });
        await rename(temporary, destination);
      } finally {
        await rm(temporary, { force: true });
      }
    },
    async read(id: string) {
      try {
        return await readFile(path(id));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          throw new CvError(
            'not-found',
            'The saved PDF is missing from local storage.',
          );
        }
        throw error;
      }
    },
  };
}

export type CvPdfStore = ReturnType<typeof createCvPdfStore>;
