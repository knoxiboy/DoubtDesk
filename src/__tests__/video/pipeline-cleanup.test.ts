import fs from "fs";
import os from "os";
import path from "path";
import { cleanupVideoArtifacts } from "../../lib/video/pipeline";

describe("cleanupVideoArtifacts", () => {
  it("removes both the rendered output and the temp directory", async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "doubtdesk-test-"));
    const tempDir = path.join(tempRoot, "audio-run");
    const outputLocation = path.join(tempRoot, "video.mp4");

    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(path.join(tempDir, "audio.mp3"), "dummy");
    fs.writeFileSync(outputLocation, "dummy video");

    await cleanupVideoArtifacts(tempDir, outputLocation);

    expect(fs.existsSync(outputLocation)).toBe(false);
    expect(fs.existsSync(tempDir)).toBe(false);
  });
});
