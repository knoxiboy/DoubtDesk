import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
import { getDatabaseUrl } from './configs/database-url';

dotenv.config({ path: ".env.local" });

export default defineConfig({
  schema: "./configs/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.NEXT_PUBLIC_NEON_DB_CONNECTION_STRING || process.env.DATABASE_URL || "",
  },
});
