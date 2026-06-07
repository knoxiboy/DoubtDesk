export function getDatabaseUrl() {
    const databaseUrl = process.env.DATABASE_URL?.trim();

    if (!databaseUrl) {
        if (process.env.NEXT_PHASE === 'phase-production-build') {
            console.warn('DATABASE_URL is not set. Using a dummy URL during the production build.');
            return 'postgresql://dummy:dummy@localhost/dummy';
        }

        throw new Error('DATABASE_URL is required. Please check your .env file.');
    }

    return databaseUrl;
}
