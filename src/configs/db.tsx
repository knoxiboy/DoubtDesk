import { drizzle } from 'drizzle-orm/neon-http';
import { getDatabaseUrl } from './database-url';

let _db: ReturnType<typeof drizzle> | undefined;

export const db: ReturnType<typeof drizzle> = (() => {
    if (process.env.NODE_ENV === 'test') {
        return undefined as unknown as ReturnType<typeof drizzle>;
    }
    if (!_db) {
        _db = drizzle(getDatabaseUrl());
    }
    return _db;
})();

/** Re-export the transaction helper so callers import from one place. */
export { db as default };

