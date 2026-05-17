import { inngest } from "./client";
import fs from "fs";
import path from "path";

export const helloWorld = inngest.createFunction(
    { id: "hello-world" },
    { event: "test/hello.world" },
    async ({ event, step }) => {
        await step.sleep("wait-a-moment", "1s");
        return { message: `Hello ${event.data.email}!` };
    },
);

export const cleanupTempAssets = inngest.createFunction(
    { id: "cleanup-temp-assets" },
    { cron: "0 * * * *" }, // Runs hourly to clean up old files and keep disk space free
    async ({ step }) => {
        const deletedFiles = await step.run("delete-old-files", async () => {
            const tempDir = path.resolve("./public/temp-assets");
            const videosDir = path.resolve("./public/videos");
            const now = Date.now();
            const retentionMs = 24 * 60 * 60 * 1000; // 24 hours
            let count = 0;

            const cleanDir = (dirPath: string) => {
                if (fs.existsSync(dirPath)) {
                    const files = fs.readdirSync(dirPath);
                    for (const file of files) {
                        const filePath = path.join(dirPath, file);
                        const stats = fs.statSync(filePath);
                        if (now - stats.mtimeMs > retentionMs) {
                            fs.unlinkSync(filePath);
                            count++;
                        }
                    }
                }
            };

            cleanDir(tempDir);
            cleanDir(videosDir);
            return count;
        });

        return { message: `Successfully cleaned up ${deletedFiles} old media files.` };
    }
);
