import type { Pool } from 'pg';
import { CvError } from '../cv.errors.ts';
import { toCvVersion, type CvVersionRow } from './cv-version.repository.ts';

export function createCvAttachmentRepository(pool: Pool, owner: string) {
  return {
    async attached(applicationId: string) {
      const { rows } = await pool.query<CvVersionRow>(
        `SELECT cv.id,cv.metadata,cv.created_at FROM application_cv_links links
         JOIN cv_versions cv ON cv.id=links.cv_id AND cv.owner_id=links.owner_id
         WHERE links.application_id=$1 AND links.owner_id=$2`,
        [applicationId, owner],
      );
      return rows[0] ? toCvVersion(rows[0]) : null;
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
        throw new CvError(
          'not-found',
          'Application or saved CV version not found.',
        );
    },
  };
}
