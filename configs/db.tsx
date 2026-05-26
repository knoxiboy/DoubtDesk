import { drizzle } from 'drizzle-orm/neon-http';

const sql = neon(process.env.NEXT_PUBLIC_NEON_DB_CONNECTION_STRING || "postgres://dummy:dummy@dummy/dummy");
export const db = drizzle(sql);

/** Re-export the transaction helper so callers import from one place. */
export { db as default };
