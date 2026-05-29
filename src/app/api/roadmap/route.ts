import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { db } from "@/configs/db";
import { roadmapsTable } from "@/configs/schema";
import { currentUser } from "@clerk/nextjs/server";
import { checkUserBlock } from "@/lib/auth-utils";

export async function POST(req: NextRequest) {
    try {
        const user = await currentUser();
        const userEmail = user?.primaryEmailAddress?.emailAddress;

        if (!userEmail) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 0. Check if user is blocked
        const { isBlocked, errorResponse } = await checkUserBlock(userEmail);
        if (isBlocked) return errorResponse;

        const { targetField, timeline, currentLevel, weeklyCommitment } = await req.json();

        if (!targetField || !timeline || !currentLevel) {
            return NextResponse.json({ error: "Required fields are missing" }, { status: 400 });
        }

        const systemPrompt = `
You are an expert Career Coach and Curriculum Designer. 
Your task is to generate a highly structured, actionable, and personalized learning roadmap based on the user's goals.

CRITICAL REQUIREMENT:
The roadmap MUST strictly cover the entire duration specified in the TIMELINE provided by the user. 
Do NOT shorten or truncate the plan. If the user asks for 12 months, provide milestones spanning 12 months.

Output Format:
You MUST respond with a valid JSON object ONLY. No conversational text.
{
  "title": "Roadmap Title",
  "description": "Brief overview of the roadmap spanning the requested timeline.",
  "milestones": [
    {
      "week": "Date Range (e.g. Week 1-2, Month 3, Year 1)",
      "goal": "Milestone Goal",
      "topics": ["Topic 1", "Topic 2"],
      "resources": ["Resource suggestion 1", "Resource suggestion 2"],
      "detailedSteps": ["Step 1: Focus on X", "Step 2: Practice Y", "Step 3: Build Z"]
    }
  ],
  "tips": ["Tip 1", "Tip 2"]
}
`;

        const userPrompt = `
TARGET FIELD: ${targetField}
TIMELINE: ${timeline}
CURRENT LEVEL: ${currentLevel}
WEEKLY COMMITMENT: ${weeklyCommitment || "Not specified"} hours/week

Generate a comprehensive roadmap for mastering ${targetField} that STRICTLY spans the entire ${timeline} duration. 
Ensure the milestones are distributed logically across the whole period.
`;

        const response = await axios.post(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                response_format: { type: "json_object" }
            },
            {
                headers: {
                    "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        const aiOutput = JSON.parse(response.data.choices[0].message.content);

        // Save to Database
        await db.insert(roadmapsTable).values({
            userEmail: userEmail,
            targetField: targetField,
            roadmapData: JSON.stringify(aiOutput)
        });

        return NextResponse.json(aiOutput);

    } catch (error: any) {
        console.error("Roadmap Generation Error DETAILS:", {
            message: error.message,
            response: error.response?.data,
            stack: error.stack
        });
        return NextResponse.json({
            error: error.message || "Failed to generate roadmap",
            details: error.response?.data || error.message
        }, { status: 500 });
    }
}
