import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
import { getDatabaseUrl } from './src/configs/database-url';

export default defineConfig({
    schema: './src/configs/schema.ts',
    out: './drizzle',
    dialect: 'postgresql',
    dbCredentials: {
        url: getDatabaseUrl(),
    },
});
