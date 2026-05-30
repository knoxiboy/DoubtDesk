import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { db } from "@/configs/db";
import { coverLettersTable } from "@/configs/schema";
import { currentUser } from "@clerk/nextjs/server";
import { checkUserBlock } from "@/lib/auth-utils";

export async function POST(req: NextRequest) {
    try {
        const user = await currentUser();
        const userEmail = user?.primaryEmailAddress?.emailAddress;

        if (userEmail) {
            const { isBlocked, errorResponse } = await checkUserBlock(userEmail);
            if (isBlocked) return errorResponse;
        }

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

        // Save to Database if user is authenticated
        if (userEmail) {
            await db.insert(coverLettersTable).values({
                userEmail,
                jobDescription,
                userDetails,
                coverLetter
            });
        }

        return NextResponse.json({ coverLetter });

    } catch (error: any) {
        console.error("Cover Letter Generation Error:", error.response?.data || error.message);
        return NextResponse.json({
            error: error.message || "Failed to generate cover letter",
        }, { status: 500 });
    }
}
