import fs from "fs";
import os from "os";
import path from "path";
import {
  readMigrationFiles,
  selectPendingMigrations,
  type MigrationFile,
} from "../../../drizzle/migrate";

const drizzleDir = path.join(process.cwd(), "drizzle");

describe("migration runner coverage", () => {
  it("reads every journal entry including late schema migrations", () => {
    const migrations = readMigrationFiles(drizzleDir);
    const tags = migrations.map((migration) => migration.tag);

    expect(tags).toContain("0000_bitter_tyger_tiger");
    expect(tags).toContain("0016_video_jobs");
    expect(tags).toContain("0019_doubts_composite_indexes");
    expect(migrations.length).toBeGreaterThanOrEqual(20);
    expect(migrations.every((migration) => migration.statements.length > 0)).toBe(
      true,
    );
  });

  it("treats an empty database as needing the full migration set", () => {
    const migrations = readMigrationFiles(drizzleDir);
    const pending = selectPendingMigrations(migrations, null);

    expect(pending).toHaveLength(migrations.length);
    expect(pending[0]?.tag).toBe(migrations[0]?.tag);
  });

  it("only schedules migrations newer than an older database watermark", () => {
    const migrations: MigrationFile[] = [
      {
        tag: "0000_base",
        when: 100,
        hash: "a",
        statements: ["SELECT 1"],
      },
      {
        tag: "0016_video_jobs",
        when: 200,
        hash: "b",
        statements: ["SELECT 2"],
      },
      {
        tag: "0019_indexes",
        when: 300,
        hash: "c",
        statements: ["SELECT 3"],
      },
    ];

    const pending = selectPendingMigrations(migrations, 100);
    expect(pending.map((migration) => migration.tag)).toEqual([
      "0016_video_jobs",
      "0019_indexes",
    ]);
  });

  it("fails fast when a journal entry is missing its SQL file", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "doubtdesk-migrate-"));
    const metaDir = path.join(tempRoot, "meta");
    fs.mkdirSync(metaDir, { recursive: true });
    fs.writeFileSync(
      path.join(metaDir, "_journal.json"),
      JSON.stringify({
        version: "7",
        dialect: "postgresql",
        entries: [
          {
            idx: 0,
            version: "7",
            when: 1,
            tag: "0000_missing",
            breakpoints: true,
          },
        ],
      }),
    );

    expect(() => readMigrationFiles(tempRoot)).toThrow(/0000_missing\.sql/);
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });
});
