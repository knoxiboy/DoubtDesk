import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { currentUser } from '@clerk/nextjs/server';

export async function POST(req: Request) {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const groq = new Groq({
            apiKey: process.env.GROQ_API_KEY,
        });

        const { content } = await req.json();
        if (!content) {
            return NextResponse.json({ error: 'Content is required' }, { status: 400 });
        }

        const systemPrompt = `You are a video script writer. Split the following educational explanation into exactly 4-5 scenes for a slide-based video.
Each scene must have:
1. "title": A short title for the slide.
2. "text": The explanation text to be shown on the slide and narrated.
3. "duration": estimated duration in seconds (usually 5-10s).
Return ONLY a JSON array of objects.`;

        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.3,
            response_format: { type: "json_object" }
        });

        const scriptJson = JSON.parse(completion.choices[0]?.message?.content || "{\"scenes\": []}");
        return NextResponse.json(scriptJson);
    } catch (error: any) {
        console.error('Script generation failed:', error);
        return NextResponse.json({ error: 'Failed to generate script' }, { status: 500 });
    }
}