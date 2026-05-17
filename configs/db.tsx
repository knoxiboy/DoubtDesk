import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEXT_PUBLIC_NEON_DB_CONNECTION_STRING!);
export const db = drizzle(sql);

/** Re-export the transaction helper so callers import from one place. */
export { db as default };
