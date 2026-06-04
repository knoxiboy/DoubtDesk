import Groq from 'groq-sdk';

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || 'dummy_key',
});

/**
 * Automatically categorizes a doubt into a specific sub-topic based on its content and subject.
 */
export async function categorizeDoubt(content: string, subject: string, imageBase64?: string): Promise<string> {
    try {
        const systemPrompt = `You are an expert academic classifier. 
Given a student's doubt and its broad subject, identify the most specific academic sub-topic (1-3 words).
Example: 
Subject: "Programming", Content: "How does this recursive function work?" -> "Recursion"
Subject: "Mathematics", Content: "Find the derivative of x^2" -> "Differential Calculus"

Respond ONLY with the sub-topic name. No punctuation or explanation.`;

        let userMessage: Groq.Chat.Completions.ChatCompletionMessageParam["content"] = `Subject: ${subject}\nContent: ${content || "See image"}`;

        if (imageBase64) {
            userMessage = [
                { type: "text", text: `Subject: ${subject}\nIdentify the specific sub-topic in this image.` },
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
            max_tokens: 20,
        });

        return completion.choices[0]?.message?.content?.trim() || "General";
    } catch (error) {
        console.error("Categorization failed:", error);
        return "General";
    }
}
