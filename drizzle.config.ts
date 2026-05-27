import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
import { getDatabaseUrl } from './configs/database-url';

export default defineConfig({

    schema: './configs/schema.ts',
    dialect: 'postgresql',
    dbCredentials: {
        url: getDatabaseUrl(),
    },
});
