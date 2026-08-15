import fs from "fs";
import os from "os";
import path from "path";
import { TEMP_ROOT, ensureTempRoot, createAudioTempDir, getVideoTempPath } from "../../lib/video/temp";

describe("temp isolation (issue #1345)", () => {
  const createdPaths: string[] = [];

  afterEach(() => {
    // Clean up any temp dirs created during tests (in reverse order for nesting)
    for (const p of createdPaths.reverse()) {
      try {
        if (fs.existsSync(p)) {
          fs.rmSync(p, { recursive: true, force: true });
        }
      } catch {
        // best-effort cleanup in tests
      }
    }
    createdPaths.length = 0;
  });

  it("TEMP_ROOT is a subdirectory of os.tmpdir(), not os.tmpdir() itself", () => {
    expect(TEMP_ROOT).toContain(os.tmpdir());
    expect(TEMP_ROOT).not.toBe(os.tmpdir());
  });

  it("ensureTempRoot creates the directory", () => {
    ensureTempRoot();
    expect(fs.existsSync(TEMP_ROOT)).toBe(true);
    expect(fs.statSync(TEMP_ROOT).isDirectory()).toBe(true);
    createdPaths.push(TEMP_ROOT);
  });

  it("createAudioTempDir returns a unique directory under TEMP_ROOT", () => {
    const dir1 = createAudioTempDir();
    const dir2 = createAudioTempDir();
    createdPaths.push(dir1, dir2);

    expect(dir1).toContain(TEMP_ROOT);
    expect(dir2).toContain(TEMP_ROOT);
    expect(dir1).not.toBe(dir2);
    expect(dir1.startsWith("doubtdesk-audio-")).toBe(false);
    expect(path.basename(dir1).startsWith("doubtdesk-audio-")).toBe(true);
    expect(fs.existsSync(dir1)).toBe(true);
    expect(fs.existsSync(dir2)).toBe(true);
  });

  it("getVideoTempPath returns a unique path under TEMP_ROOT", () => {
    const p1 = getVideoTempPath();
    // Ensure next call gets a distinct Date.now() value
    const start = Date.now();
    while (Date.now() === start) { /* spin */ }
    const p2 = getVideoTempPath();
    createdPaths.push(path.dirname(p1), path.dirname(p2));

    expect(p1).toContain(TEMP_ROOT);
    expect(p2).toContain(TEMP_ROOT);
    expect(p1).not.toBe(p2);
    expect(path.basename(p1).startsWith("video-")).toBe(true);
    expect(path.basename(p1).endsWith(".mp4")).toBe(true);
  });

  it("two concurrent jobs get isolated directories (Scenario A)", () => {
    const jobADir = createAudioTempDir();
    const jobBDir = createAudioTempDir();
    createdPaths.push(jobADir, jobBDir);

    // Write a file in each directory
    fs.writeFileSync(path.join(jobADir, "audio.mp3"), "job-a");
    fs.writeFileSync(path.join(jobBDir, "audio.mp3"), "job-b");

    // Deleting job A's directory must NOT affect job B
    fs.rmSync(jobADir, { recursive: true, force: true });
    expect(fs.existsSync(jobADir)).toBe(false);
    expect(fs.existsSync(jobBDir)).toBe(true);
    expect(fs.readFileSync(path.join(jobBDir, "audio.mp3"), "utf-8")).toBe("job-b");
  });

  it("cleanup scoped to TEMP_ROOT cannot delete files outside it (Scenario E)", () => {
    // Create a file directly in os.tmpdir() — simulating an unrelated application
    const unrelatedFile = path.join(os.tmpdir(), "unrelated-app-data.txt");
    fs.writeFileSync(unrelatedFile, "do not delete");

    // Create DoubtDesk temp assets
    const ddDir = createAudioTempDir();
    createdPaths.push(ddDir);
    fs.writeFileSync(path.join(ddDir, "audio.mp3"), "doubtdesk data");

    // Simulate cleanup: only scan TEMP_ROOT, never os.tmpdir()
    const entries = fs.readdirSync(TEMP_ROOT);
    let cleanedCount = 0;
    for (const entry of entries) {
      const entryPath = path.join(TEMP_ROOT, entry);
      if (entry.startsWith("doubtdesk-audio-") && fs.statSync(entryPath).isDirectory()) {
        fs.rmSync(entryPath, { recursive: true, force: true });
        cleanedCount++;
      }
    }

    expect(cleanedCount).toBeGreaterThanOrEqual(1);
    // The unrelated file MUST survive
    expect(fs.existsSync(unrelatedFile)).toBe(true);
    expect(fs.readFileSync(unrelatedFile, "utf-8")).toBe("do not delete");

    // Clean up unrelated file
    fs.unlinkSync(unrelatedFile);
  });

  it("pipeline video output lands under TEMP_ROOT, not directly in os.tmpdir()", () => {
    const videoPath = getVideoTempPath();
    createdPaths.push(path.dirname(videoPath));

    // Verify the video file is under the app root, not directly in /tmp/
    expect(videoPath).toContain(TEMP_ROOT);
    // Verify it's NOT directly in os.tmpdir()
    expect(path.dirname(videoPath)).not.toBe(os.tmpdir());
  });
});
