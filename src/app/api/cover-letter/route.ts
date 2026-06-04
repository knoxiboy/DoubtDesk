import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { db } from "@/configs/db";
import { coverLettersTable } from "@/configs/schema";
import { currentUser } from "@clerk/nextjs/server";
import { checkUserBlock } from "@/lib/auth-utils";

export async function POST(req: NextRequest) {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userEmail = user.primaryEmailAddress?.emailAddress;
        if (!userEmail) {
            return NextResponse.json({ error: "User email not found" }, { status: 400 });
        }

        const { errorResponse } = await checkUserBlock(userEmail);
        if (errorResponse) return errorResponse;

        const { jobDescription, userDetails } = await req.json();

        if (!jobDescription || !userDetails) {
            return NextResponse.json({ error: "Job description and user details are required" }, { status: 400 });
        }

        const systemPrompt = `
You are an expert Career Coach and Professional Resume/Cover Letter Writer.
Your task is to write a highly professional, compelling, and tailored cover letter based on the provided Job Description and User Details.

The cover letter should:
1. Follow a standard business letter format.
2. Be tailored specifically to the Job Description.
3. Highlight the user's relevant skills and experiences.
4. Maintain a professional, confident, and enthusiastic tone.
5. Be concise (around 300-400 words).

Output Format:
Return only the text of the cover letter. Do not include any conversational filler or meta-commentary.
`;

        const userPrompt = `
JOB DESCRIPTION:
${jobDescription}

USER DETAILS (Skills, Experience, achievements, etc.):
${userDetails}

Write a professional cover letter based on these details.
`;

        const response = await axios.post(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.7,
            },
            {
                headers: {
                    "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        const coverLetter = response.data.choices[0].message.content;

        await db.insert(coverLettersTable).values({
            userEmail,
            jobDescription,
            userDetails,
            coverLetter
        });

        return NextResponse.json({ coverLetter });

    } catch (error: unknown) {
        const err = error as { response?: { data?: unknown }; message?: string };
        console.error("Cover Letter Generation Error:", err.response?.data || err.message);
        return NextResponse.json({
            error: err.message || "Failed to generate cover letter",
        }, { status: 500 });
    }
}
