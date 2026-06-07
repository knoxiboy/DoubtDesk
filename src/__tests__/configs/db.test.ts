const missingDatabaseUrlError = 'DATABASE_URL is required. Please check your .env file.';

describe('getDatabaseUrl', () => {
    const originalDatabaseUrl = process.env.DATABASE_URL;
    const originalPublicDatabaseUrl = process.env.NEXT_PUBLIC_NEON_DB_CONNECTION_STRING;
    const originalNextPhase = process.env.NEXT_PHASE;

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

        if (originalNextPhase) {
            process.env.NEXT_PHASE = originalNextPhase;
        } else {
            delete process.env.NEXT_PHASE;
        }
    });

    it.each([undefined, '', '   '])('throws when DATABASE_URL is %p', (databaseUrl) => {
        if (databaseUrl === undefined) {
            delete process.env.DATABASE_URL;
        } else {
            process.env.DATABASE_URL = databaseUrl;
        }

        const { getDatabaseUrl } = require('@/configs/database-url');

        expect(() => getDatabaseUrl()).toThrow(missingDatabaseUrlError);
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

        expect(() => getDatabaseUrl()).toThrow(missingDatabaseUrlError);
    });

    it('uses a dummy URL only during the production build', () => {
        delete process.env.DATABASE_URL;
        process.env.NEXT_PHASE = 'phase-production-build';

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

    it('throws a clear error when DATABASE_URL is missing', () => {
        expect(() => require('@/configs/db')).toThrow(missingDatabaseUrlError);
    });
});
