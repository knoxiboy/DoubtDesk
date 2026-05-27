export function getDatabaseUrl() {
    const databaseUrl = process.env.DATABASE_URL?.trim();

    if (!databaseUrl) {
        throw new Error('DATABASE_URL is required. Please check your .env file.');
    }

    return databaseUrl;
}
