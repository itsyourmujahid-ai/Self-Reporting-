import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

// Add global connection pool caching to persist across hot-reloads
declare global {
  var _postgresPool: Pool | undefined;
}

// Function to create or retrieve the connection pool using the Object Method
export const createPool = () => {
  if (!global._postgresPool) {
    const rawUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
    let connectionString: string | undefined;

    if (rawUrl) {
      if (rawUrl.startsWith('postgresql://') || rawUrl.startsWith('postgres://')) {
        connectionString = rawUrl;
      } else if (rawUrl.startsWith('https://') && rawUrl.includes('.supabase.co')) {
        const projectRef = rawUrl.replace('https://', '').split('.')[0];
        console.log(`[Supabase] Detected Project: ${rawUrl} (Project Ref: ${projectRef})`);
        
        const dbPassword = process.env.SUPABASE_DB_PASSWORD;
        if (dbPassword) {
          connectionString = `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${projectRef}.supabase.co:5432/postgres`;
        } else {
          console.log(`[Supabase] Note: To connect via PostgreSQL, provide the full Supabase Connection URI (postgresql://postgres:[PASSWORD]@db.${projectRef}.supabase.co:5432/postgres) in DATABASE_URL or set SUPABASE_DB_PASSWORD.`);
        }
      }
    }
    
    if (connectionString) {
      console.log('[Database] Connecting to production database via PostgreSQL connection string with SSL');
      global._postgresPool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
        max: 10,
        connectionTimeoutMillis: 15000,
      });
    } else {
      const isCloudSqlUnixSocket = process.env.SQL_HOST && process.env.SQL_HOST.startsWith('/');
      global._postgresPool = new Pool({
        host: process.env.SQL_HOST,
        port: process.env.SQL_PORT ? Number(process.env.SQL_PORT) : 5432,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DB_NAME,
        ssl: isCloudSqlUnixSocket ? false : { rejectUnauthorized: false },
        max: 10,
        connectionTimeoutMillis: 15000,
      });
    }

    // Prevent unhandled pool-level errors from crashing the application
    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

// Create or retrieve the pool instance
const pool = createPool();

// Initialize Drizzle with the pool and schema
export const db = drizzle(pool, { schema });
export { schema };
