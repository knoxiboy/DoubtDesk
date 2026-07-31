import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { getDatabaseUrl, isLocalPostgresUrl } from './database-url';

function createDbClient() {
    const url = getDatabaseUrl();
    const isLocalPostgres = isLocalPostgresUrl(url);
    const isEdgeRuntime = process.env.NEXT_RUNTIME === 'edge';
    const maxPool = process.env.DATABASE_POOL_MAX ? parseInt(process.env.DATABASE_POOL_MAX, 10) : 10;
    const idleTimeout = process.env.DATABASE_POOL_IDLE_TIMEOUT ? parseInt(process.env.DATABASE_POOL_IDLE_TIMEOUT, 10) : 30000;

    if (isLocalPostgres) {
        if (isEdgeRuntime) {
            // Edge Runtime cannot instantiate Node.js 'pg' TCP connection pools (requires Node net, tls, and crypto).
            // Return null so middleware on Edge Runtime gracefully handles/bypasses direct TCP DB queries without crashing.
            return null;
        }
        const { Pool: PgPool } = require('pg');
        const { drizzle: drizzlePg } = require('drizzle-orm/node-postgres');
        const pool = new PgPool({
            connectionString: url,
            max: maxPool,
            idleTimeoutMillis: idleTimeout,
        });
        pool.on('error', (err: Error) => {
            console.error('PostgreSQL Pool connection error:', err);
        });
        return drizzlePg({ client: pool });
    } else {
        if (typeof globalThis.WebSocket === 'undefined') {
            const ws = require('ws');
            neonConfig.webSocketConstructor = ws;
        }
        const pool = new NeonPool({
            connectionString: url,
            max: maxPool,
            idleTimeoutMillis: idleTimeout,
        });
        pool.on('error', (err: Error) => {
            console.error('Neon Database Pool connection error:', err);
        });
        return drizzleNeon({ client: pool });
    }
}

let dbClient: any;

if (process.env.NODE_ENV === 'production') {
    dbClient = createDbClient();
} else {
    const g = globalThis as any;
    if (!g.dbClient) {
        g.dbClient = createDbClient();
    }
    dbClient = g.dbClient;
}

export const db = dbClient;

/** Re-export the database client so callers import from one place. */
export { db as default };
