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
  await pool.query(`
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS owner_id text NOT NULL DEFAULT 'local';
    CREATE UNIQUE INDEX IF NOT EXISTS applications_id_owner ON applications (id, owner_id);
    CREATE TABLE IF NOT EXISTS cv_versions (
      id uuid PRIMARY KEY,
      owner_id text NOT NULL,
      metadata jsonb NOT NULL,
      document jsonb,
      saved boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (id, owner_id)
    );
    CREATE TABLE IF NOT EXISTS application_cv_links (
      application_id uuid NOT NULL,
      owner_id text NOT NULL,
      cv_id uuid NOT NULL,
      PRIMARY KEY (application_id, owner_id),
      FOREIGN KEY (application_id, owner_id) REFERENCES applications (id, owner_id) ON DELETE CASCADE,
      FOREIGN KEY (cv_id, owner_id) REFERENCES cv_versions (id, owner_id)
    );
  `);
}
