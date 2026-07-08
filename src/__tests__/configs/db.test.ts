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

        expect(getDatabaseUrl()).toBe('postgresql://dummy:dummy@ep-cool-darkness-123456.us-east-2.aws.neon.tech/neondb?sslmode=require');
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

        expect(getDatabaseUrl()).toBe('postgresql://dummy:dummy@ep-cool-darkness-123456.us-east-2.aws.neon.tech/neondb?sslmode=require');
    });
});

describe('database configuration', () => {
    const originalDatabaseUrl = process.env.DATABASE_URL;
    const originalNodeEnv = process.env.NODE_ENV;

    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
        delete process.env.DATABASE_URL;
        Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: true });
    });

    afterEach(() => {
        if (originalDatabaseUrl) {
            process.env.DATABASE_URL = originalDatabaseUrl;
        } else {
            delete process.env.DATABASE_URL;
        }
        if (originalNodeEnv) {
            Object.defineProperty(process.env, 'NODE_ENV', { value: originalNodeEnv, writable: true });
        } else {
            delete process.env.NODE_ENV;
        }
    });

    it('initializes db successfully without throwing even when DATABASE_URL is missing (uses dummy)', () => {
        expect(() => require('@/configs/db')).not.toThrow();
    });
});