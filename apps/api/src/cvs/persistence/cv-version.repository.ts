import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type { CvDocument, CvVersion } from '@tracker/shared';

type Metadata = Omit<CvVersion, 'id' | 'createdAt'>;
export type CvVersionRow = {
  id: string;
  metadata: Metadata;
  created_at: Date;
};

type StoredVersionRow = CvVersionRow & {
  document: CvDocument | null;
  saved: boolean;
};

type StoredVersion = {
  version: CvVersion;
  document: CvDocument | null;
  saved: boolean;
};

export const toCvVersion = ({
  id,
  metadata,
  created_at,
}: CvVersionRow): CvVersion => ({
  id,
  ...metadata,
  createdAt: created_at.toISOString(),
});

function toStoredVersion(
  row: StoredVersionRow | undefined,
): StoredVersion | null {
  return row
    ? { version: toCvVersion(row), document: row.document, saved: row.saved }
    : null;
}

export function createCvVersionRepository(pool: Pool, owner: string) {
  return {
    async list() {
      const { rows } = await pool.query<CvVersionRow>(
        'SELECT id,metadata,created_at FROM cv_versions WHERE owner_id=$1 AND saved ORDER BY created_at DESC,id DESC',
        [owner],
      );
      return rows.map(toCvVersion);
    },
    async insert(
      metadata: Metadata,
      document: CvDocument | null,
      id = randomUUID(),
      saved = false,
    ) {
      const { rows } = await pool.query<CvVersionRow>(
        'INSERT INTO cv_versions(id,owner_id,metadata,document,saved) VALUES($1,$2,$3,$4,$5) RETURNING *',
        [id, owner, metadata, document, saved],
      );
      return toCvVersion(rows[0]!);
    },
    async find(id: string) {
      const { rows } = await pool.query<StoredVersionRow>(
        'SELECT * FROM cv_versions WHERE id=$1 AND owner_id=$2',
        [id, owner],
      );
      return toStoredVersion(rows[0]);
    },
    async withLockedVersion<T>(
      id: string,
      useVersion: (
        stored: StoredVersion | null,
        markSaved: (document: CvDocument) => Promise<void>,
      ) => Promise<T>,
    ) {
      const connection = await pool.connect();
      try {
        await connection.query('BEGIN');
        const { rows } = await connection.query<StoredVersionRow>(
          'SELECT * FROM cv_versions WHERE id=$1 AND owner_id=$2 FOR UPDATE',
          [id, owner],
        );
        const result = await useVersion(
          toStoredVersion(rows[0]),
          async (document) => {
            await connection.query(
              'UPDATE cv_versions SET saved=true,document=$3 WHERE id=$1 AND owner_id=$2',
              [id, owner, document],
            );
          },
        );
        await connection.query('COMMIT');
        return result;
      } catch (error) {
        await connection.query('ROLLBACK').catch(() => {});
        throw error;
      } finally {
        connection.release();
      }
    },
  };
}

export type CvVersionRepository = ReturnType<typeof createCvVersionRepository>;
