// src/app/api/inngest/ConfusionSpikeDetector.ts
import { inngest } from "@/inngest/client"; // FIXED: Verified absolute layout resolution mapping
import { db } from "@/configs/db";
import { doubtsTable, confusionAlertsTable } from "@/configs/schema"; 
import { and, gte, eq, desc } from "drizzle-orm";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "dummy_key" });

// Explicit interface representing the database row structure before JSON serialization
interface DoubtPayload {
    id: number;
    content: string | null;
    subject: string | null;
    createdAt: Date;
}

// Represents the shape AFTER step.run serialization where Date converts to a string
interface SerializedDoubtPayload {
    id: number;
    content: string | null;
    subject: string | null;
    createdAt: string; 
}

interface AnalysisResult {
    isSpike: boolean;
    coreConcept: string;
    confidenceScore: number;
    summary: string;
}

export const detectConfusionSpikes = inngest.createFunction(
    // Argument 1: Complete Configuration and Triggers Object (Inngest v4 Style)
    { 
        id: "detect-confusion-spikes", 
        name: "Detect Confusion Spikes",
        debounce: {
            key: "event.data.classroomId",
            period: "60s"
        },
        triggers: [
            { event: "doubt/created" }
        ]
    },
    // Argument 2: The Functional Workflow Execution Block
    async ({ event, step }) => { 
        const { classroomId } = event.data;

        if (!classroomId) return { skipped: "No classroomId provided" };

        // 1. Cooldown check: Deterministic query timeframe generation
        const hasRecentAlert = await step.run("check-cooldown-window", async (): Promise<boolean> => {
            const lookbackTime = new Date(Date.now() - 30 * 60 * 1000);
            
            const [recentAlert] = await db
                .select({ id: confusionAlertsTable.id })
                .from(confusionAlertsTable)
                .where(
                    and(
                        eq(confusionAlertsTable.classroomId, Number(classroomId)),
                        gte(confusionAlertsTable.createdAt, lookbackTime)
                    )
                )
                .orderBy(desc(confusionAlertsTable.createdAt))
                .limit(1);

            return !!recentAlert; 
        });

        if (hasRecentAlert) {
            return { skipped: "Cooldown window active for this classroom" };
        }

        // 2. Threshold Check
        const dynamicDoubts = await step.run("fetch-recent-classroom-doubts", async (): Promise<DoubtPayload[]> => {
            const lookbackTime = new Date(Date.now() - 30 * 60 * 1000);
            
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

        if (!dynamicDoubts || dynamicDoubts.length < 5) {
            return { 
                status: "Threshold not met", 
                count: dynamicDoubts ? dynamicDoubts.length : 0 
            };
        }

        // 3. Groq LLM Processing
        const clusteringAnalysis = await step.run("cluster-doubts-with-groq", async (): Promise<AnalysisResult> => {
            const formattedDoubts = (dynamicDoubts as unknown as SerializedDoubtPayload[])
                .map((d: SerializedDoubtPayload, index: number) => `${index + 1}. [Subject: ${d.subject || 'General'}] ${d.content || ''}`)
                .join("\n");

            const systemPrompt = `You are an advanced academic internal tracking assistant analyzing real-time classroom friction points. 
Review the list of students' technical doubts below and determine if there is a core cluster or theme pointing to a specific misunderstood sub-topic.

Return a valid, strict JSON object with this exact shape:
{
  "isSpike": boolean,
  "coreConcept": "string description of the shared topic or root point of confusion",
  "confidenceScore": number (between 0 and 1),
  "summary": "Brief summary explaining what the students are collectively struggling with"
}`;

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
                return JSON.parse(contentText) as AnalysisResult;
            } catch (parseError) {
                console.error("Failed to parse Groq raw content structure:", parseError);
                return {
                    isSpike: false,
                    coreConcept: "Parsing Error Fallback",
                    confidenceScore: 0,
                    summary: "Failed to cleanly parse structured analytical metrics from model output."
                };
            }
        });

        if (!clusteringAnalysis.isSpike) {
            return { status: "Analyzed, but no significant thematic confusion spike detected." };
        }

        // 4. Fully isolated deterministic database log execution
        await step.run("persist-confusion-alert-log", async () => {
            const executionTimestamp = new Date();
            
            const computedAction = `Consider hosting a brief interactive discussion or query resolution session regarding "${clusteringAnalysis.coreConcept || 'this topic'}".`;
            
            const serializedArray = dynamicDoubts as unknown as SerializedDoubtPayload[];
            const mappedIds = serializedArray ? serializedArray.slice(0, 5).map((d: SerializedDoubtPayload) => d.id) : [];

            await db.insert(confusionAlertsTable).values({
                classroomId: Number(classroomId),                     
                topic: clusteringAnalysis.coreConcept || "General Confusion Spike", 
                summary: clusteringAnalysis.summary || "Multiple students are exhibiting core structural concept doubts.",
                suggestedAction: computedAction,                     
                confidence: Math.round((clusteringAnalysis.confidenceScore || 0) * 100), 
                doubtCount: dynamicDoubts.length, 
                sampleDoubtIds: JSON.stringify(mappedIds),           
                status: "active",                                     
                createdAt: executionTimestamp
            });
            
            return { success: true };
        });

        return { 
            status: "Alert processed", 
            topic: clusteringAnalysis.coreConcept 
        };
    }
);
