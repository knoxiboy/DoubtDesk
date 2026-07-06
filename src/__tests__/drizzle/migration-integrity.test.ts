import fs from 'fs';
import path from 'path';

const drizzleDir = path.join(process.cwd(), 'drizzle');

function getMigrationFiles(): string[] {
    return fs
        .readdirSync(drizzleDir)
        .filter((f: any) => f.endsWith('.sql'))
        .sort();
}

describe('drizzle migration directory integrity', () => {
    it('has no duplicate numeric version prefixes', () => {
        const files = getMigrationFiles();
        const prefixes = files.map((f: any) => f.match(/^(\d+)_/)?.[1]);

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

        const idxValues = entries.map((e: any) => e.idx);
        expect(new Set(idxValues).size).toBe(idxValues.length);

        const sortedIdx = [...idxValues].sort((a: any, b: any) => a - b);
        sortedIdx.forEach((idx: any, i: any) => expect(idx).toBe(i));

        for (const entry of entries) {
            const sqlPath = path.join(drizzleDir, `${entry.tag}.sql`);
            expect(fs.existsSync(sqlPath)).toBe(true);
        }

         const files = getMigrationFiles();
        const tags = entries.map((e: any) => e.tag);
        expect(new Set(tags).size).toBe(tags.length);

         const journalTags = new Set(entries.map((e: any) => e.tag));
        expect(journalTags.size).toBe(files.length);
         for (const file of files) {
             const tag = file.replace(/\.sql$/, '');
             expect(journalTags.has(tag)).toBe(true);
         }
    });

    it('does not contain empty or non-UTF8 placeholder migration files', () => {
        const files = getMigrationFiles();
        const decoder = new TextDecoder('utf-8', { fatal: true });
        for (const file of files) {
            const buf = fs.readFileSync(path.join(drizzleDir, file));
            let text: string;
            expect(() => {
                text = decoder.decode(buf);
            }).not.toThrow();
            expect(text!.trim().length).toBeGreaterThan(0);
        }
    });
});