// src/lib/ai/recommendations.ts
import Groq from "groq-sdk";

// Early exit if Groq is not configured — skip guaranteed auth failure
const groqApiKey = process.env.GROQ_API_KEY;
const groq = groqApiKey
    ? new Groq({ apiKey: groqApiKey })
    : null;

export interface WeakTopic {
    topic: string | null;
    subject: string;
    totalCount: number;
    unresolvedCount: number;
    sampleDoubtIds: number[];
}

export interface TeachingRecommendation {
    topic: string;
    subject: string;
    action: string;
    reasoning: string;
    priority: "high" | "medium" | "low";
    sampleDoubtIds: number[];
}

/**
 * Stable key for matching AI output back to DB input.
 */
function makeKey(topic: string | null, subject: string): string {
    return `${(topic || "general").toLowerCase().trim()}||${subject.toLowerCase().trim()}`;
}

/**
 * Fallback rule-based recommendations when Groq is unavailable.
 */
function buildFallbackRecommendation(topic: WeakTopic): TeachingRecommendation {
    const unresolvedRatio =
        topic.totalCount > 0 ? topic.unresolvedCount / topic.totalCount : 0;

    const priority: "high" | "medium" | "low" =
        unresolvedRatio >= 0.7 ? "high" :
        unresolvedRatio >= 0.4 ? "medium" : "low";

    return {
        topic: topic.topic || topic.subject,
        subject: topic.subject,
        action: `Schedule a focused revision session on "${topic.topic || topic.subject}" — ${topic.unresolvedCount} out of ${topic.totalCount} doubts remain unresolved.`,
        reasoning: `${Math.round(unresolvedRatio * 100)}% of doubts on this topic are unresolved, indicating students need direct teacher intervention.`,
        priority,
        sampleDoubtIds: topic.sampleDoubtIds,
    };
}

/**
 * Generates AI-powered teaching recommendations for weak topics
 * using Groq. Falls back to rule-based recommendations if Groq is
 * unavailable or unconfigured.
 *
 * @param weakTopics - Topics with high unresolved doubt counts
 * @returns Array of teaching recommendations
 */
export async function generateRecommendations(
    weakTopics: WeakTopic[]
): Promise<TeachingRecommendation[]> {
    if (!weakTopics || weakTopics.length === 0) return [];

    // Short-circuit: if Groq is not configured, skip guaranteed auth failure
    if (!groq) {
        console.warn("[Recommendations] GROQ_API_KEY not set, using fallback.");
        return weakTopics.map(buildFallbackRecommendation);
    }

    try {
        const topicSummary = weakTopics
            .map(
                (t, i) =>
                    `${i + 1}. Topic: "${t.topic || "General"}" | Subject: ${t.subject} | Total Doubts: ${t.totalCount} | Unresolved: ${t.unresolvedCount}`
            )
            .join("\n");

        const response = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            temperature: 0.3,
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: `You are an expert academic teaching advisor for a university classroom platform called DoubtDesk.
Your job is to analyze weak topic data and generate specific, actionable teaching recommendations for teachers.

Rules:
- Each recommendation must be concrete and pedagogically appropriate (e.g. "Hold a 20-minute recap session", "Create a practice quiz", "Use a visual diagram to re-explain")
- Base recommendations on actual unresolved doubt counts, not generic advice
- Keep action text under 20 words
- Keep reasoning text under 25 words
- Priority: "high" if unresolved >= 70% of total, "medium" if 40-69%, "low" if below 40%
- Return one recommendation per input topic, in the SAME ORDER as input
- Never suggest anything harmful or inappropriate

Return ONLY a valid JSON object in this exact shape:
{
  "recommendations": [
    {
      "topic": "string (exact topic name from input)",
      "subject": "string (exact subject name from input)",
      "action": "string (specific teaching action, under 20 words)",
      "reasoning": "string (why this is needed, under 25 words)",
      "priority": "high" | "medium" | "low"
    }
  ]
}`,
                },
                {
                    role: "user",
                    content: `Here are the weak topics from my classroom that need teaching recommendations:\n\n${topicSummary}\n\nGenerate one recommendation per topic in the same order.`,
                },
            ],
        });

        const raw = response.choices[0]?.message?.content;
        if (!raw) throw new Error("Empty response from Groq");

        const parsed = JSON.parse(raw);
        const aiRecs = parsed?.recommendations;

        if (!Array.isArray(aiRecs) || aiRecs.length === 0) {
            throw new Error("Invalid recommendations format");
        }

        // Build a lookup map from DB input keyed by topic+subject
        const inputMap = new Map<string, WeakTopic>();
        for (const wt of weakTopics) {
            inputMap.set(makeKey(wt.topic, wt.subject), wt);
        }

        // Merge AI output with DB metadata using stable topic+subject key
        const results: TeachingRecommendation[] = [];
        for (const rec of aiRecs) {
            const key = makeKey(rec.topic, rec.subject);
            const match = inputMap.get(key);

            results.push({
                topic: rec.topic || match?.topic || match?.subject || "General",
                subject: rec.subject || match?.subject || "",
                action: rec.action || "Review this topic in next class.",
                reasoning: rec.reasoning || "High unresolved doubt count.",
                priority: ["high", "medium", "low"].includes(rec.priority)
                    ? rec.priority
                    : "medium",
                // Use matched DB entry for sampleDoubtIds, fallback to empty
                sampleDoubtIds: match?.sampleDoubtIds || [],
            });
        }

        // For any input topic not covered by AI output, add fallback
        for (const wt of weakTopics) {
            const key = makeKey(wt.topic, wt.subject);
            const alreadyCovered = results.some(
                (r) => makeKey(r.topic, r.subject) === key
            );
            if (!alreadyCovered) {
                results.push(buildFallbackRecommendation(wt));
            }
        }

        return results;

    } catch (error) {
        console.error("[Recommendations] Groq failed, using fallback:", error);
        return weakTopics.map(buildFallbackRecommendation);
    }
}