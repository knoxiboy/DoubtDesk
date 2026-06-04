import { drizzle } from 'drizzle-orm/neon-http';

export const db = drizzle(process.env.NEXT_PUBLIC_NEON_DB_CONNECTION_STRING!);

/** Re-export the transaction helper so callers import from one place. */
export { db as default };
