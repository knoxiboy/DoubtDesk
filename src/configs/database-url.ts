export function getDatabaseUrl() {
    const isTest = process.env.NODE_ENV === 'test';
    const databaseUrl = (
        process.env.DATABASE_URL || 
        (!isTest ? process.env.NEXT_PUBLIC_NEON_DB_CONNECTION_STRING : undefined)
    )?.trim();

    if (!databaseUrl) {
        throw new Error('DATABASE_URL is required. Please check your .env file.');
    }

    return databaseUrl;
}
