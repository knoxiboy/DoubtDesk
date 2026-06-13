import { drizzle } from 'drizzle-orm/neon-http';
import { getDatabaseUrl } from './database-url';

export const db = drizzle(getDatabaseUrl());

/** Re-export the transaction helper so callers import from one place. */
export { db as default };

