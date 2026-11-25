import pg from 'pg';
export function createPool() {
  return new pg.Pool({
    connectionString:
      process.env['DATABASE_URL'] ??
      'postgres://tracker:tracker_local@localhost:54329/tracker',
  });
}
