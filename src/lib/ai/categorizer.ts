import type Groq from 'groq-sdk';
import { groq } from '@/lib/ai/groq-client';

export interface CategorizationResult {
    subTopic: string;
    difficulty: string;
    suggestedTags: string[];
}

/**
 * Automatically categorizes a doubt into a specific sub-topic, difficulty, and suggests tags based on its content and subject.
 */
export async function categorizeDoubt(content: string, subject: string, imageBase64?: string): Promise<CategorizationResult> {
    try {
        const systemPrompt = `You are an expert academic classifier. 
Given a student's doubt and its broad subject, identify the most specific academic sub-topic (1-3 words), the difficulty level (beginner, intermediate, advanced), and up to 3 relevant tags.

Respond ONLY with a valid JSON object in the following format, with no extra text or markdown:
{
  "subTopic": "string",
  "difficulty": "string",
  "suggestedTags": ["string"]
}`;

        let userMessage: Groq.Chat.Completions.ChatCompletionMessageParam["content"] = `Subject: ${subject}\nContent: ${content || "See image"}`;

        if (imageBase64) {
            userMessage = [
                { type: "text", text: `Subject: ${subject}\nAnalyze this image and provide the JSON.` },
                { type: "image_url", image_url: { url: imageBase64 } }
            ];
        }

        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage }
            ],
            model: imageBase64 ? "meta-llama/llama-4-scout-17b-16e-instruct" : "llama-3.3-70b-versatile",
            temperature: 0.1,
            max_tokens: 150,
            response_format: { type: "json_object" },
        });

        const rawContent = completion.choices[0]?.message?.content?.trim() || "{}";
        const parsed = JSON.parse(rawContent);

        return {
            subTopic: parsed.subTopic || "General",
            difficulty: parsed.difficulty || "intermediate",
            suggestedTags: Array.isArray(parsed.suggestedTags) ? parsed.suggestedTags : []
        };
    } catch (error) {
        console.error("Categorization failed:", error);
        return {
            subTopic: "General",
            difficulty: "intermediate",
            suggestedTags: []
        };
    }
}
