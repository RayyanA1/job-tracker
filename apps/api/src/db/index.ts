import pg from 'pg';
export function createPool() {
  return new pg.Pool({
    connectionString:
      process.env['DATABASE_URL'] ??
      'postgres://tracker:tracker_local@localhost:54329/tracker',
  });
}
export async function initializeDatabase(pool: pg.Pool) {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS applications (id uuid PRIMARY KEY, data jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())`,
  );
}
