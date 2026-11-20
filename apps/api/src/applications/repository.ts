import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type { Application, ApplicationInput } from '@tracker/shared';
type ApplicationRow = { id: string; data: ApplicationInput; updated_at: Date };
const toApplication = (row: ApplicationRow): Application => ({
  ...row.data,
  id: row.id,
  updatedAt: row.updated_at.toISOString(),
});
export function createApplicationsRepository(pool: Pool) {
  return {
    async list() {
      const result = await pool.query<ApplicationRow>(
        'SELECT * FROM applications ORDER BY updated_at DESC',
      );
      return result.rows.map(toApplication);
    },
    async find(id: string) {
      const result = await pool.query<ApplicationRow>(
        'SELECT * FROM applications WHERE id=$1',
        [id],
      );
      return result.rows[0] ? toApplication(result.rows[0]) : null;
    },
    async create(input: ApplicationInput) {
      const result = await pool.query<ApplicationRow>(
        'INSERT INTO applications(id,data) VALUES($1,$2) RETURNING *',
        [randomUUID(), input],
      );
      return toApplication(result.rows[0]!);
    },
    async update(id: string, input: ApplicationInput) {
      const result = await pool.query<ApplicationRow>(
        'UPDATE applications SET data=$2,updated_at=now() WHERE id=$1 RETURNING *',
        [id, input],
      );
      return result.rows[0] ? toApplication(result.rows[0]) : null;
    },
  };
}
export type ApplicationsRepository = ReturnType<
  typeof createApplicationsRepository
>;
