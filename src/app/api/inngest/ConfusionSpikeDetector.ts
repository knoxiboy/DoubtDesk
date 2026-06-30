// src/app/api/inngest/ConfusionSpikeDetector.ts
import { inngest } from "@/inngest/client";
import { db } from "@/configs/db";
import { doubtsTable, confusionAlertsTable } from "@/configs/schema";
import { and, gte, eq, desc } from "drizzle-orm";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "dummy_key" });

const LOOKBACK_MS = 30 * 60 * 1000; // 30 minutes
const COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes per topic
const SPIKE_THRESHOLD = 5;

// Explicit interface mapping to clear compiler type-inference ambiguities
interface DoubtPayload {
    id: number;
    content: string | null;
    subject: string | null;
    createdAt: Date;
}

interface TopicCluster {
    topic: string;
    doubtIndices: number[]; // 1-based indices into the provided doubts list
    confidenceScore: number;
    summary: string;
}

interface ClusteringResult {
    clusters: TopicCluster[];
}

export const detectConfusionSpikes = inngest.createFunction(
    {
        id: "detect-confusion-spikes",
        name: "Detect Confusion Spikes",
        // Native architectural debounce drops back-to-back spam requests gracefully
        debounce: {
            key: "event.data.classroomId",
            period: "60s"
        },
        triggers: [{ event: "doubt/created" }]
    },
    async ({ event, step }: { event: { data: any }, step: any }) => {
        const { classroomId } = event.data;

        if (!classroomId) return { skipped: "No classroomId provided" };

        // 1. Fetch recent doubts for this classroom
        const dynamicDoubts: DoubtPayload[] = await step.run("fetch-recent-classroom-doubts", async (): Promise<DoubtPayload[]> => {
            const lookbackTime = new Date(Date.now() - LOOKBACK_MS);

            return await db
                .select({
                    id: doubtsTable.id,
                    content: doubtsTable.content,
                    subject: doubtsTable.subject,
                    createdAt: doubtsTable.createdAt
                })
                .from(doubtsTable)
                .where(
                    and(
                        eq(doubtsTable.classroomId, Number(classroomId)),
                        gte(doubtsTable.createdAt, lookbackTime)
                    )
                );
        });

        if (!dynamicDoubts || dynamicDoubts.length < SPIKE_THRESHOLD) {
            return {
                status: "Threshold not met",
                count: dynamicDoubts ? dynamicDoubts.length : 0
            };
        }

        // 2. Ask Groq to group doubts into one or more topic clusters
        const clusteringResult = await step.run("cluster-doubts-with-groq", async (): Promise<ClusteringResult> => {
            const formattedDoubts = dynamicDoubts
                .map((d: DoubtPayload, index: number) => `${index + 1}. [Subject: ${d.subject || 'General'}] ${d.content || ''}`)
                .join("\n");

            const systemPrompt = `You are an advanced academic internal tracking assistant analyzing real-time classroom friction points.
Review the numbered list of students' technical doubts below and group them into one or more topic clusters based on the underlying concept each doubt is about. A cluster represents a distinct sub-topic that multiple students appear confused about.

Return a valid, strict JSON object with this exact shape:
{
  "clusters": [
    {
      "topic": "string description of the shared sub-topic",
      "doubtIndices": [number, ...],
      "confidenceScore": number (between 0 and 1),
      "summary": "Brief summary explaining what the students are collectively struggling with"
    }
  ]
}

Rules:
- "doubtIndices" must reference the 1-based numbers from the provided list.
- Only include a cluster if at least ${SPIKE_THRESHOLD} doubts genuinely share that sub-topic.
- If no cluster meets that bar, return { "clusters": [] }.
- A doubt may belong to at most one cluster.`;

            const response = await groq.chat.completions.create({
                model: "llama3-8b-8192",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Here are the active doubts:\n\n${formattedDoubts}` }
                ],
                response_format: { type: "json_object" },
                temperature: 0.2
            });

            const contentText = response.choices[0]?.message?.content;
            if (!contentText) {
                throw new Error("Empty analytical stream payload received from Groq inference engine.");
            }

            try {
                const parsed = JSON.parse(contentText) as ClusteringResult;
                return { clusters: Array.isArray(parsed.clusters) ? parsed.clusters : [] };
            } catch (parseError) {
                console.error("Failed to parse Groq raw content structure:", parseError);
                return { clusters: [] };
            }
        });

        // 3. Filter down to clusters that actually meet the spike threshold
        const spikeClusters = clusteringResult.clusters.filter(
            (c) => Array.isArray(c.doubtIndices) && c.doubtIndices.length >= SPIKE_THRESHOLD && c.topic
        );

        if (spikeClusters.length === 0) {
            return { status: "Analyzed, but no significant thematic confusion spike detected." };
        }

        // 4. For each spiking cluster, check per-topic cooldown then persist an alert
        const results = [];

        for (const cluster of spikeClusters) {
            const clusterResult = await step.run(`process-cluster-${cluster.topic}`, async () => {
                const lookbackTime = new Date(Date.now() - COOLDOWN_MS);

                // Per-topic cooldown: skip if an alert for this exact topic in this
                // classroom was already created recently.
                const [recentAlert] = await db
                    .select({ id: confusionAlertsTable.id })
                    .from(confusionAlertsTable)
                    .where(
                        and(
                            eq(confusionAlertsTable.classroomId, Number(classroomId)),
                            eq(confusionAlertsTable.topic, cluster.topic),
                            gte(confusionAlertsTable.createdAt, lookbackTime)
                        )
                    )
                    .orderBy(desc(confusionAlertsTable.createdAt))
                    .limit(1);

                if (recentAlert) {
                    return { topic: cluster.topic, skipped: "Cooldown window active for this topic" };
                }

                const mappedIds = cluster.doubtIndices
                    .map((idx) => dynamicDoubts[idx - 1]?.id)
                    .filter((id): id is number => typeof id === "number")
                    .slice(0, 5);

                const computedAction = `Consider hosting a brief interactive discussion or query resolution session regarding "${cluster.topic}".`;

                await db.insert(confusionAlertsTable).values({
                    classroomId: Number(classroomId),
                    topic: cluster.topic,
                    summary: cluster.summary || "Multiple students are exhibiting core structural concept doubts.",
                    suggestedAction: computedAction,
                    confidence: Math.round((cluster.confidenceScore || 0) * 100),
                    doubtCount: cluster.doubtIndices.length,
                    sampleDoubtIds: JSON.stringify(mappedIds),
                    status: "active",
                    createdAt: new Date()
                });

                return { topic: cluster.topic, status: "Alert processed" };
            });

            results.push(clusterResult);
        }

        return { status: "Processed clusters", clusters: results };
    }
);