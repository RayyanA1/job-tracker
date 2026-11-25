import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { Pool } from 'pg';
import type { CvDocument, CvVersion } from '@tracker/shared';
import { CvError, profileDirectory } from './profile.ts';
import { fitCv } from './pdf.ts';

type Metadata = Omit<CvVersion, 'id' | 'createdAt'>;
type Row = {
  id: string;
  metadata: Metadata;
  created_at: Date;
  document: CvDocument | null;
  saved: boolean;
};
const version = ({ id, metadata, created_at }: Row): CvVersion => ({
  id,
  ...metadata,
  createdAt: created_at.toISOString(),
});
const missing = () => new CvError(404, 'CV version not found.');

export function createCvsRepository(pool: Pool, owner: string) {
  const path = (id: string) =>
    join(
      process.env.CV_PDF_DIR
        ? join(process.env.CV_PDF_DIR, owner)
        : profileDirectory(owner),
      'pdfs',
      `${id}.pdf`,
    );

  async function storePdf(id: string, pdf: Buffer) {
    const destination = path(id);
    const temporary = `${destination}.${randomUUID()}.tmp`;
    await mkdir(dirname(destination), { recursive: true, mode: 0o700 });
    try {
      await writeFile(temporary, pdf, { mode: 0o600, flag: 'wx' });
      await rename(temporary, destination);
    } finally {
      await rm(temporary, { force: true });
    }
  }

  async function insert(
    metadata: Metadata,
    document: CvDocument | null,
    id = randomUUID(),
    saved = false,
  ) {
    const { rows } = await pool.query<Row>(
      'INSERT INTO cv_versions(id,owner_id,metadata,document,saved) VALUES($1,$2,$3,$4,$5) RETURNING *',
      [id, owner, metadata, document, saved],
    );
    return version(rows[0]!);
  }

  return {
    async list() {
      const { rows } = await pool.query<Row>(
        'SELECT id,metadata,created_at FROM cv_versions WHERE owner_id=$1 AND saved ORDER BY created_at DESC,id DESC',
        [owner],
      );
      return rows.map(version);
    },
    async draft(metadata: Metadata, document: CvDocument) {
      const fitted = await fitCv(document);
      const { id } = await insert(metadata, fitted.document);
      return { id, document: fitted.document, trimmed: fitted.trimmed };
    },
    async import(name: string, bytes: Buffer) {
      const id = randomUUID();
      await storePdf(id, bytes);
      return insert(
        { kind: 'imported', name, company: '', title: '', url: '' },
        null,
        id,
        true,
      );
    },
    async save(id: string) {
      const connection = await pool.connect();
      try {
        await connection.query('BEGIN');
        const { rows } = await connection.query<Row>(
          'SELECT * FROM cv_versions WHERE id=$1 AND owner_id=$2 FOR UPDATE',
          [id, owner],
        );
        const row = rows[0];
        if (!row) throw missing();
        if (!row.saved) {
          if (!row.document) throw missing();
          const fitted = await fitCv(row.document);
          await storePdf(id, fitted.bytes);
          await connection.query(
            'UPDATE cv_versions SET saved=true,document=$3 WHERE id=$1 AND owner_id=$2',
            [id, owner, fitted.document],
          );
        }
        await connection.query('COMMIT');
        return version(row);
      } catch (error) {
        await connection.query('ROLLBACK').catch(() => {});
        throw error;
      } finally {
        connection.release();
      }
    },
    async pdf(id: string) {
      const { rows } = await pool.query<Row>(
        'SELECT * FROM cv_versions WHERE id=$1 AND owner_id=$2',
        [id, owner],
      );
      const row = rows[0];
      if (!row) throw missing();
      const bytes = row.saved
        ? await readFile(path(id)).catch((error: NodeJS.ErrnoException) => {
            if (error.code === 'ENOENT')
              throw new CvError(
                404,
                'The saved PDF is missing from local storage.',
              );
            throw error;
          })
        : row.document
          ? (await fitCv(row.document)).bytes
          : null;
      if (!bytes) throw missing();
      return { bytes, name: row.metadata.name };
    },
    async attached(applicationId: string) {
      const { rows } = await pool.query<Row>(
        `SELECT cv.id,cv.metadata,cv.created_at FROM application_cv_links links
         JOIN cv_versions cv ON cv.id=links.cv_id AND cv.owner_id=links.owner_id
         WHERE links.application_id=$1 AND links.owner_id=$2`,
        [applicationId, owner],
      );
      return rows[0] ? version(rows[0]) : null;
    },
    async attach(applicationId: string, cvId: string | null) {
      if (!cvId) {
        await pool.query(
          'DELETE FROM application_cv_links WHERE application_id=$1 AND owner_id=$2',
          [applicationId, owner],
        );
        return;
      }
      const result = await pool.query(
        `INSERT INTO application_cv_links(application_id,owner_id,cv_id)
         SELECT app.id,app.owner_id,cv.id FROM applications app
         JOIN cv_versions cv ON cv.id=$3 AND cv.owner_id=app.owner_id AND cv.saved
         WHERE app.id=$1 AND app.owner_id=$2
         ON CONFLICT(application_id,owner_id) DO UPDATE SET cv_id=excluded.cv_id`,
        [applicationId, owner, cvId],
      );
      if (!result.rowCount)
        throw new CvError(404, 'Application or saved CV version not found.');
    },
  };
}
