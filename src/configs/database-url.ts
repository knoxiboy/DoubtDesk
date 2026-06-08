export function getDatabaseUrl() {
    const databaseUrl = process.env.DATABASE_URL?.trim();

    if (!databaseUrl) {
        // Return a dummy URL during build steps so Next.js static evaluation doesn't crash.
        // At runtime, if this is truly missing, actual DB queries will fail.
        console.warn('⚠️ DATABASE_URL is not set. Using dummy URL. If this is a build step, it is safe to ignore.');
        return 'postgresql://dummy:dummy@ep-cool-darkness-123456.us-east-2.aws.neon.tech/neondb?sslmode=require';
    }

    return databaseUrl;
}
