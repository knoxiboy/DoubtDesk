import fs from "fs";
import path from "path";

const rootDir = path.resolve(__dirname, "../..");
const textFileExtensions = new Set([
  ".env",
  ".js",
  ".jsx",
  ".json",
  ".md",
  ".mjs",
  ".ts",
  ".tsx",
  ".yml",
  ".yaml",
]);
const scannedRootFiles = [
  ".env.example",
  "README.md",
  "CONTRIBUTING.md",
  "drizzle.config.ts",
  "next.config.mjs",
];
const scannedDirs = ["app", "configs", "lib", "scripts", "inngest", ".github"];

function collectTextFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      return collectTextFiles(fullPath);
    }

    if (!entry.isFile()) {
      return [];
    }

    return entry.name.startsWith(".env") ||
      textFileExtensions.has(path.extname(entry.name))
      ? [fullPath]
      : [];
  });
}

function collectSecurityRelevantFiles(): string[] {
  const rootFiles = scannedRootFiles
    .map((file) => path.join(rootDir, file))
    .filter((file) => fs.existsSync(file));

  const dirFiles = scannedDirs.flatMap((dir) => {
    const fullPath = path.join(rootDir, dir);

    return fs.existsSync(fullPath) ? collectTextFiles(fullPath) : [];
  });

  return [...rootFiles, ...dirFiles];
}

describe("environment variable security", () => {
  it("does not expose the Neon database connection string through NEXT_PUBLIC_", () => {
    const publicNeonConnectionString = [
      "NEXT",
      "PUBLIC",
      "NEON",
      "DB",
      "CONNECTION",
      "STRING",
    ].join("_");

    const matches = collectSecurityRelevantFiles().flatMap((file) => {
      const content = fs.readFileSync(file, "utf8");

      return content.includes(publicNeonConnectionString)
        ? [path.relative(rootDir, file)]
        : [];
    });

    expect(matches).toEqual([]);
  });
});
