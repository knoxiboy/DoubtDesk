import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import 'dotenv/config';
import { getDatabaseUrl } from '../src/configs/database-url';
import fs from 'fs';
import path from 'path';

const neonSql = neon(getDatabaseUrl());
const db = drizzle(neonSql);

async function main() {
    // Read and execute 0006_replies_anonymization.sql manually
    console.log("Running manual migration 0006_replies_anonymization.sql...");
    const migration6 = fs.readFileSync(path.join(__dirname, '0006_replies_anonymization.sql'), 'utf-8').split('--> statement-breakpoint');
    for (const q of migration6) {
        if (q.trim()) {
            await db.execute(sql.raw(q.trim()));
        }
    }

    // Read and execute 0007_environment_cascades.sql manually
    console.log("Running manual migration 0007_environment_cascades.sql...");
    const migration7 = fs.readFileSync(path.join(__dirname, '0007_environment_cascades.sql'), 'utf-8').split('--> statement-breakpoint');
    for (const q of migration7) {
        if (q.trim()) {
            await db.execute(sql.raw(q.trim()));
        }
    }

    console.log("Migration complete!");
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
