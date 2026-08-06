import { createHash, randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import "dotenv/config";
import { getDatabaseUrl } from "../src/configs/database-url";

const LOCK_ID = 1;
const LOCK_TTL_MINUTES = 15;
const MIGRATIONS_SCHEMA = "drizzle";
const LOCK_TABLE = "migration_lock";

export type MigrationFile = {
  tag: string;
  when: number;
  hash: string;
  statements: string[];
};

export type JournalEntry = {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints: boolean;
};

export function resolveMigrationsFolder(cwd = process.cwd()) {
  return path.join(cwd, "drizzle");
}

export function readJournal(migrationsFolder: string): JournalEntry[] {
  const journalPath = path.join(migrationsFolder, "meta", "_journal.json");
  if (!fs.existsSync(journalPath)) {
    throw new Error(`Can't find meta/_journal.json in ${migrationsFolder}`);
  }

  const journal = JSON.parse(fs.readFileSync(journalPath, "utf-8")) as {
    entries: JournalEntry[];
  };

  return journal.entries;
}

export function readMigrationFiles(migrationsFolder: string): MigrationFile[] {
  const entries = readJournal(migrationsFolder);

  return entries.map((entry) => {
    const migrationPath = path.join(migrationsFolder, `${entry.tag}.sql`);
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`No file ${migrationPath} found in ${migrationsFolder}`);
    }

    const query = fs.readFileSync(migrationPath, "utf-8");
    return {
      tag: entry.tag,
      when: entry.when,
      hash: createHash("sha256").update(query).digest("hex"),
      statements: query
        .split("--> statement-breakpoint")
        .map((statement) => statement.trim())
        .filter(Boolean),
    };
  });
}

export function selectPendingMigrations(
  migrations: MigrationFile[],
  lastAppliedWhen: number | null,
) {
  if (lastAppliedWhen == null) return migrations;
  return migrations.filter((migration) => migration.when > lastAppliedWhen);
}

type DbClient = ReturnType<typeof drizzle>;

async function ensureLockTable(db: DbClient) {
  await db.execute(sql`CREATE SCHEMA IF NOT EXISTS ${sql.identifier(MIGRATIONS_SCHEMA)}`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ${sql.identifier(MIGRATIONS_SCHEMA)}.${sql.identifier(LOCK_TABLE)} (
      id integer PRIMARY KEY,
      holder text NOT NULL,
      acquired_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

function extractRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && "rows" in result) {
    const rows = (result as { rows?: T[] }).rows;
    return Array.isArray(rows) ? rows : [];
  }
  return [];
}

export async function acquireMigrationLock(db: DbClient, holder: string) {
  await ensureLockTable(db);

  const result = await db.execute(sql`
    INSERT INTO ${sql.identifier(MIGRATIONS_SCHEMA)}.${sql.identifier(LOCK_TABLE)} (id, holder, acquired_at)
    VALUES (${LOCK_ID}, ${holder}, now())
    ON CONFLICT (id) DO UPDATE
      SET holder = EXCLUDED.holder,
          acquired_at = EXCLUDED.acquired_at
      WHERE ${sql.identifier(MIGRATIONS_SCHEMA)}.${sql.identifier(LOCK_TABLE)}.acquired_at
        < now() - make_interval(mins => ${LOCK_TTL_MINUTES})
    RETURNING holder
  `);

  const rows = extractRows<{ holder: string }>(result);
  if (!rows.some((row) => row.holder === holder)) {
    throw new Error(
      "Could not acquire migration lock. Another deploy is likely applying migrations.",
    );
  }
}

export async function releaseMigrationLock(db: DbClient, holder: string) {
  await db.execute(sql`
    DELETE FROM ${sql.identifier(MIGRATIONS_SCHEMA)}.${sql.identifier(LOCK_TABLE)}
    WHERE id = ${LOCK_ID} AND holder = ${holder}
  `);
}

export async function runMigrations(options?: {
  migrationsFolder?: string;
  databaseUrl?: string;
}) {
  const migrationsFolder =
    options?.migrationsFolder ?? resolveMigrationsFolder();
  const envUrl = process.env.DATABASE_URL?.trim();
  const databaseUrl = options?.databaseUrl ?? envUrl;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to run migrations");
  }

  // Validate the tracked migration set before touching the database.
  const migrations = readMigrationFiles(migrationsFolder);
  if (migrations.length === 0) {
    throw new Error(`No migrations found in ${migrationsFolder}`);
  }

  const neonSql = neon(databaseUrl);
  const db = drizzle(neonSql);
  const holder = `migrate-${process.pid}-${randomUUID()}`;

  await acquireMigrationLock(db, holder);

  try {
    console.log(
      `Running ${migrations.length} tracked migration(s) from ${migrationsFolder}...`,
    );
    await migrate(db, { migrationsFolder });
    console.log("Migration complete!");
    return { total: migrations.length, tags: migrations.map((m) => m.tag) };
  } finally {
    await releaseMigrationLock(db, holder).catch((error) => {
      console.error("Failed to release migration lock:", error);
    });
  }
}

async function main() {
  // Prefer explicit env; fall back to shared helper only when set.
  if (!process.env.DATABASE_URL?.trim()) {
    // Touch helper for consistent messaging in app contexts, but still fail closed.
    getDatabaseUrl();
    throw new Error("DATABASE_URL is required to run migrations");
  }

  await runMigrations();
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (
  invokedPath.endsWith(`${path.sep}migrate.ts`) ||
  invokedPath.endsWith(`${path.sep}migrate.js`) ||
  invokedPath.endsWith(`${path.sep}run-migrations.js`)
) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
