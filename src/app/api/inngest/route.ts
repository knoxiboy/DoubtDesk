// src/app/api/inngest/route.ts
import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import { 
    helloWorld, 
    cleanupTempAssets, 
    sendReplyNotification, 
    sendDailyDigest, 
    sendWeeklyDigest,
    detectConfusionSpikes,
    generateVideo,
    cleanupStaleVideoJobs
} from "../../../inngest/functions";

// Serve your registered background processes safely
export const { GET, POST, PUT } = serve({
    client: inngest,
    functions: [
        helloWorld,
        cleanupTempAssets,
        sendReplyNotification,
        sendDailyDigest,
        sendWeeklyDigest,
        detectConfusionSpikes,
        generateVideo,
        cleanupStaleVideoJobs
    ],
});