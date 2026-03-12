import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var __depoStokDbPool: Pool | undefined;
}

let pool: Pool | null = globalThis.__depoStokDbPool ?? null;

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required.');
  }

  const sslEnabled = process.env.DATABASE_SSL === 'true';
  const parsedUrl = new URL(connectionString);
  const user = decodeURIComponent(parsedUrl.username || '');
  const password = decodeURIComponent(parsedUrl.password || '');
  const host = parsedUrl.hostname;
  const port = parsedUrl.port ? Number(parsedUrl.port) : 5432;
  const database = parsedUrl.pathname.replace(/^\//, '') || 'postgres';

  return new Pool({
    user,
    password,
    host,
    port,
    database,
    max: 30,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: sslEnabled ? { rejectUnauthorized: false } : undefined
  });
}

export function getDbPool(): Pool {
  if (!pool) {
    pool = createPool();
    globalThis.__depoStokDbPool = pool;
  }

  return pool;
}

export async function queryDb<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values?: unknown[]
): Promise<QueryResult<T>> {
  return getDbPool().query<T>(text, values);
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getDbPool().connect();

  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
