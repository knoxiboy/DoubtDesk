describe('getDatabaseUrl', () => {
    const originalDatabaseUrl = process.env.DATABASE_URL;
    const originalPublicDatabaseUrl = process.env.NEXT_PUBLIC_NEON_DB_CONNECTION_STRING;

    beforeEach(() => {
        jest.resetModules();
    });

    afterEach(() => {
        if (originalDatabaseUrl) {
            process.env.DATABASE_URL = originalDatabaseUrl;
        } else {
            delete process.env.DATABASE_URL;
        }

        if (originalPublicDatabaseUrl) {
            process.env.NEXT_PUBLIC_NEON_DB_CONNECTION_STRING = originalPublicDatabaseUrl;
        } else {
            delete process.env.NEXT_PUBLIC_NEON_DB_CONNECTION_STRING;
        }
    });

    it.each([undefined, '', '   '])('returns dummy URL when DATABASE_URL is %p', (databaseUrl) => {
        if (databaseUrl === undefined) {
            delete process.env.DATABASE_URL;
        } else {
            process.env.DATABASE_URL = databaseUrl;
        }

        const { getDatabaseUrl } = require('@/configs/database-url');

        expect(getDatabaseUrl()).toBe('postgresql://dummy:dummy@localhost/dummy');
    });

    it('returns a trimmed DATABASE_URL when configured', () => {
        process.env.DATABASE_URL = '  postgresql://user:password@host/database?sslmode=require  ';

        const { getDatabaseUrl } = require('@/configs/database-url');

        expect(getDatabaseUrl()).toBe('postgresql://user:password@host/database?sslmode=require');
    });

    it('does not fall back to the old public database variable', () => {
        delete process.env.DATABASE_URL;
        process.env.NEXT_PUBLIC_NEON_DB_CONNECTION_STRING = 'postgresql://public-prefix/database';

        const { getDatabaseUrl } = require('@/configs/database-url');

        expect(getDatabaseUrl()).toBe('postgresql://dummy:dummy@localhost/dummy');
    });
});

describe('database configuration', () => {
    const originalDatabaseUrl = process.env.DATABASE_URL;

    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
        delete process.env.DATABASE_URL;
    });

    afterEach(() => {
        if (originalDatabaseUrl) {
            process.env.DATABASE_URL = originalDatabaseUrl;
        } else {
            delete process.env.DATABASE_URL;
        }
    });

    it('initializes db successfully without throwing even when DATABASE_URL is missing (uses dummy)', () => {
        expect(() => require('@/configs/db')).not.toThrow();
    });
});
