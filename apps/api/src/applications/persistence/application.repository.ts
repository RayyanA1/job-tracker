import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type { Application, ApplicationInput } from '@tracker/shared';
type ApplicationRow = { id: string; data: ApplicationInput; updated_at: Date };
const toApplication = (row: ApplicationRow): Application => ({
  ...row.data,
  id: row.id,
  updatedAt: row.updated_at.toISOString(),
});
export function createApplicationsRepository(pool: Pool, owner: string) {
  return {
    async list() {
      const result = await pool.query<ApplicationRow>(
        'SELECT * FROM applications WHERE owner_id=$1 ORDER BY updated_at DESC',
        [owner],
      );
      return result.rows.map(toApplication);
    },
    async find(id: string) {
      const result = await pool.query<ApplicationRow>(
        'SELECT * FROM applications WHERE id=$1 AND owner_id=$2',
        [id, owner],
      );
      return result.rows[0] ? toApplication(result.rows[0]) : null;
    },
    async create(input: ApplicationInput) {
      const result = await pool.query<ApplicationRow>(
        'INSERT INTO applications(id,data,owner_id) VALUES($1,$2,$3) RETURNING *',
        [randomUUID(), input, owner],
      );
      return toApplication(result.rows[0]!);
    },
    async update(id: string, input: ApplicationInput) {
      const result = await pool.query<ApplicationRow>(
        'UPDATE applications SET data=$2,updated_at=now() WHERE id=$1 AND owner_id=$3 RETURNING *',
        [id, input, owner],
      );
      return result.rows[0] ? toApplication(result.rows[0]) : null;
    },
  };
}
export type ApplicationsRepository = ReturnType<
  typeof createApplicationsRepository
>;
