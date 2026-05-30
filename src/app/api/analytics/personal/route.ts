import { NextResponse } from 'next/server';
import { db } from '@/configs/db';
import { doubtsTable, usersTable } from '@/configs/schema';
import { and, eq, desc } from 'drizzle-orm';
import { currentUser } from '@clerk/nextjs/server';
import Groq from 'groq-sdk';

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || 'dummy_key',
});

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const classroomIdStr = searchParams.get("classroomId");
    const classroomId = classroomIdStr ? parseInt(classroomIdStr) : null;

    if (!classroomId) {
        return NextResponse.json({ error: "Classroom ID required" }, { status: 400 });
    }

    try {
        const user = await currentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const email = user.primaryEmailAddress?.emailAddress;

        // Fetch user's doubts in this classroom
        const userDoubts = await db.select({
            content: doubtsTable.content,
            subject: doubtsTable.subject,
            createdAt: doubtsTable.createdAt
        })
        .from(doubtsTable)
        .where(
            and(
                eq(doubtsTable.classroomId, classroomId),
                eq(doubtsTable.userEmail, email!)
            )
        )
        .orderBy(desc(doubtsTable.createdAt));

        if (userDoubts.length < 2) {
            return NextResponse.json({ 
                isEngaged: false,
                message: "Ask at least 2-3 doubts to unlock personalized AI Weak Topic Detection! Your AI mentor needs a bit more data to identify patterns in your learning.",
                weakTopics: [],
                recommendations: []
            });
        }

        // Prepare doubt summaries for AI analysis
        const doubtContext = userDoubts.map(d => `- [${d.subject}]: ${d.content}`).join('\n');

        const systemPrompt = `You are an AI Learning Mentor. Analyze the student's academic doubts across their classroom activities.
        Your goal is to identify patterns, recurring sub-topics they struggle with, and provide actionable recommendations.
        
        Strictly return a JSON object with:
        {
            "weakTopics": [
                { "topic": "Name (e.g. Recursion)", "reason": "Why it's a weak topic", "confidence": "High/Medium" }
            ],
            "insight": "A general summary of their learning status (max 2 sentences)",
            "recommendations": {
                "practiceQuestions": ["Question 1", "Question 2"],
                "conceptExplainer": "A short, crystal-clear explanation (max 3 sentences) for their most critical weak topic."
            }
        }`;

        const response = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Analyze these doubts asked by the student in this classroom:\n\n${doubtContext}` }
            ],
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" }
        });

        const result = JSON.parse(response.choices[0].message.content || "{}");

        return NextResponse.json({
            isEngaged: true,
            ...result
        });

    } catch (error: any) {
        console.error("Personal Analytics Error:", error);
        return NextResponse.json({ error: "Failed to generate personal insights" }, { status: 500 });
    }
}
