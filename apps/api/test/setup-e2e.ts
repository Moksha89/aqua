const configured = process.env.DATABASE_URL;
const databaseUrl = configured ?? 'postgresql://aqua:aqua@localhost:5432/aqua_e2e?schema=public';

let databaseName: string;
try {
  databaseName = new URL(databaseUrl).pathname.replace(/^\/+/, '');
} catch {
  throw new Error('E2E DATABASE_URL must be a valid PostgreSQL URL');
}

if (!databaseName || databaseName === 'aqua' || databaseName === 'postgres') {
  throw new Error(`Refusing to run destructive e2e tests against database "${databaseName || '(missing)'}"; use an isolated *_e2e database`);
}

if (!/_e2e$/i.test(databaseName)) {
  throw new Error(`Refusing to run destructive e2e tests against "${databaseName}"; database name must end with _e2e`);
}

process.env.DATABASE_URL = databaseUrl;
