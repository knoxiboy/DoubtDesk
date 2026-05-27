import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { getDatabaseUrl } from './database-url';

const sql = neon(getDatabaseUrl());
export const db = drizzle(sql);

/** Re-export the transaction helper so callers import from one place. */
export { db as default };
