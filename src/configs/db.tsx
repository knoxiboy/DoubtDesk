import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { getDatabaseUrl } from './database-url';

// Setup WebSocket constructor for Node environments (required for @neondatabase/serverless Pool)
if (typeof globalThis.WebSocket === 'undefined') {
    const ws = require('ws');
    neonConfig.webSocketConstructor = ws;
}

let pool: Pool;
let dbClient: ReturnType<typeof drizzle>;

if (process.env.NODE_ENV === 'production') {
    pool = new Pool({
        connectionString: getDatabaseUrl(),
        max: process.env.DATABASE_POOL_MAX ? parseInt(process.env.DATABASE_POOL_MAX, 10) : 10,
        idleTimeoutMillis: process.env.DATABASE_POOL_IDLE_TIMEOUT ? parseInt(process.env.DATABASE_POOL_IDLE_TIMEOUT, 10) : 30000,
    });
    pool.on('error', (err: Error) => {
        console.error('Neon Database Pool connection error:', err);
    });
    dbClient = drizzle({ client: pool });
} else {
    const g = globalThis as any;
    if (!g.pool) {
        g.pool = new Pool({
            connectionString: getDatabaseUrl(),
            max: process.env.DATABASE_POOL_MAX ? parseInt(process.env.DATABASE_POOL_MAX, 10) : 10,
            idleTimeoutMillis: process.env.DATABASE_POOL_IDLE_TIMEOUT ? parseInt(process.env.DATABASE_POOL_IDLE_TIMEOUT, 10) : 30000,
        });
        g.pool.on('error', (err: Error) => {
            console.error('Neon Database Pool connection error:', err);
        });
    }
    pool = g.pool;
    if (!g.dbClient) {
        g.dbClient = drizzle({ client: pool });
    }
    dbClient = g.dbClient;
}

export const db = dbClient;

/** Re-export the database client so callers import from one place. */
export { db as default };
