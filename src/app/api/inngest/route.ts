import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import { 
    helloWorld, 
    cleanupTempAssets, 
    sendReplyNotification, 
    sendDailyDigest, 
    sendWeeklyDigest,
    detectConfusionSpikes 
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
        // Registers the real-time event consumer stream for classroom analytics
        detectConfusionSpikes
    ],
});
