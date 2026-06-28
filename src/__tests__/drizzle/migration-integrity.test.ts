import fs from 'fs';
import path from 'path';

const drizzleDir = path.join(process.cwd(), 'drizzle');

function getMigrationFiles(): string[] {
    return fs
        .readdirSync(drizzleDir)
        .filter((f) => f.endsWith('.sql'))
        .sort();
}

describe('drizzle migration directory integrity', () => {
    it('has no duplicate numeric version prefixes', () => {
        const files = getMigrationFiles();
        const prefixes = files.map((f) => f.match(/^(\d+)_/)?.[1]);

        expect(prefixes.every(Boolean)).toBe(true);

        const seen = new Set<string>();
        const duplicates: string[] = [];
        for (const prefix of prefixes as string[]) {
            if (seen.has(prefix)) duplicates.push(prefix);
            seen.add(prefix);
        }

        expect(duplicates).toEqual([]);
    });

    it('has a journal.json that uniquely and contiguously indexes every migration file', () => {
        const journalPath = path.join(drizzleDir, 'meta', '_journal.json');
        expect(fs.existsSync(journalPath)).toBe(true);

        const journal = JSON.parse(fs.readFileSync(journalPath, 'utf-8'));
        const entries = journal.entries as { idx: number; tag: string }[];

        const idxValues = entries.map((e) => e.idx);
        expect(new Set(idxValues).size).toBe(idxValues.length);

        const sortedIdx = [...idxValues].sort((a, b) => a - b);
        sortedIdx.forEach((idx, i) => expect(idx).toBe(i));

        for (const entry of entries) {
            const sqlPath = path.join(drizzleDir, `${entry.tag}.sql`);
            expect(fs.existsSync(sqlPath)).toBe(true);
        }

        const files = getMigrationFiles();
        const journalTags = new Set(entries.map((e) => e.tag));
        for (const file of files) {
            const tag = file.replace(/\.sql$/, '');
            expect(journalTags.has(tag)).toBe(true);
        }
    });

    it('does not contain empty or non-UTF8 placeholder migration files', () => {
        const files = getMigrationFiles();
        for (const file of files) {
            const buf = fs.readFileSync(path.join(drizzleDir, file));
            expect(buf.includes(0)).toBe(false);
            expect(buf.toString('utf-8').trim().length).toBeGreaterThan(0);
        }
    });
});