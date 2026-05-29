import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { createRequire } from "module";
import { db } from "@/configs/db";
import { resumeAnalysisTable } from "@/configs/schema";
import { currentUser } from "@clerk/nextjs/server";
import { checkUserBlock } from "@/lib/auth-utils";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse-fork");

const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024;
const SUPPORTED_RESUME_MIME_TYPES = new Set(["application/pdf"]);

function isUploadedFile(value: FormDataEntryValue | null): value is File {
    return (
        typeof value === "object" &&
        value !== null &&
        "arrayBuffer" in value &&
        "size" in value &&
        "type" in value &&
        "name" in value
    );
}

function validateResumeFile(file: File) {
    if (!SUPPORTED_RESUME_MIME_TYPES.has(file.type)) {
        return "Only PDF resume files are supported";
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
        return "Only PDF resume files are supported";
    }

    if (file.size > MAX_RESUME_SIZE_BYTES) {
        return "Resume file must be 5MB or smaller";
    }

    return null;
}

// Forced Refresh: 2026-02-09T06:05:00Z
export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("resume");
        const jobDescription = formData.get("jobDescription") as string || "";
        const fieldOfInterest = formData.get("fieldOfInterest") as string || "";
        const targetRole = formData.get("targetRole") as string || "";

        if (!isUploadedFile(file)) {
            return NextResponse.json({ error: "Resume file is required" }, { status: 400 });
        }

        const validationError = validateResumeFile(file);
        if (validationError) {
            return NextResponse.json({ error: validationError }, { status: 400 });
        }

        const user = await currentUser();
        const userEmail = user?.primaryEmailAddress?.emailAddress;

        if (userEmail) {
            const { isBlocked, errorResponse } = await checkUserBlock(userEmail);
            if (isBlocked) return errorResponse;
        }

        // 1. Extract text from PDF using pdf-parse-fork (Robust, no worker issues)
        const buffer = Buffer.from(await file.arrayBuffer());
        let resumeText = "";

        try {
            const data = await pdf(buffer);
            resumeText = data.text;
        } catch (parseError: any) {
            console.error("PDF Parsing Error:", parseError);
            return NextResponse.json({
                error: "Unable to read the uploaded PDF. Please upload a valid text-based PDF resume."
            }, { status: 400 });
        }

        if (!resumeText || resumeText.trim().length === 0) {
            return NextResponse.json({ error: "Failed to extract text from the PDF" }, { status: 400 });
        }

        // 3. AI Analysis using Groq
        const hasJD = !!jobDescription.trim();
        const hasIntent = !!(fieldOfInterest.trim() || targetRole.trim());

        let mode = "general";
        if (hasJD) mode = "strict_jd";
        else if (hasIntent) mode = "career_intent";

        const systemPrompt = `
You are a professional ATS (Applicant Tracking System) Expert and Senior Tech Recruiter.
Your task is to provide a detailed resume analysis report.

Evaluation Mode: ${mode === "strict_jd" ? "Strict Job Description Matching" : mode === "career_intent" ? "Career Intent Alignment" : "General Profile Perception"}

Criteria for Evaluation:
${mode === "strict_jd"
                ? `- Keyword Match: Are primary skills from the JD present?
- Experience Depth: Matches required years/level?
- Relevance: How well does this resume fit this specific role?`
                : mode === "career_intent"
                    ? `- Industry Fit: Is the resume optimized for the "${fieldOfInterest}" field?
- Target Alignment: Does it reflect the quality expected by "${targetRole}"?
- Skill Gaps: What skills are missing to be competitive in this specific career path?`
                    : `- Presentation: Is it formatted professionally?
- Impact: Uses strong action verbs and quantifiable results?
- Skill Clarity: Are technical skills clearly categorized?`}

Output Format:
You MUST respond with a valid JSON object only. No conversational text.
{
  "score": (number 0-100),
  "summary": "A concise overview of the analysis.",
  "scoreBreakdown": {
    "skills": (number 0-100),
    "projects": (number 0-100),
    "experience": (number 0-100),
    "ats": (number 0-100),
    "impact": (number 0-100),
    "industryFit": (number 0-100)
  },
  "strengths": ["Strength 1", "Strength 2"],
  "weaknesses": ["Improvement area 1", "Improvement area 2"],
  "improvementPoints": [
    "Actionable advice 1",
    "Actionable advice 2"
  ],
  "missingKeywords": [${mode === "strict_jd" ? "List of keywords from JD missing" : mode === "career_intent" ? "Industry-standard skills missing for this intent" : ""}],
  "sectionwiseAnalysis": {
    "education": "Deep analytical feedback on education section. E.g., 'Solid foundation but missing major coursework context. Add relevant subjects...'",
    "experience": "Deep analytical feedback on experience section. Evaluate bullets, metrics, and leadership. Suggest exact rewrites.",
    "projects": "Deep analytical feedback on projects. Are they too academic? Do they list technologies or actual impact? Suggest features to add.",
    "skills": "Deep analytical feedback on skills section. E.g., 'Strong React experience, but missing state management or testing frameworks...'"
  }
}
`;

        const userPrompt = `
${mode === "strict_jd" ? `TARGET JOB DESCRIPTION:\n${jobDescription}` : ""}
${mode === "career_intent" ? `CAREER INTENT:\nField: ${fieldOfInterest}\nTarget: ${targetRole}` : ""}
${mode === "general" ? "MODE: General Portfolio Review" : ""}

RESUME TEXT:
${resumeText}
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

        // Save to Database if user is authenticated
        if (userEmail) {
            // Use field/role as title if job description is empty
            const displayTitle = jobDescription.trim()
                ? jobDescription
                : (fieldOfInterest || targetRole)
                    ? `${fieldOfInterest}${fieldOfInterest && targetRole ? ' - ' : ''}${targetRole}`.trim()
                    : "General Analysis";

            await db.insert(resumeAnalysisTable).values({
                userEmail,
                resumeText,
                resumeName: file.name,
                jobDescription: displayTitle,
                analysisData: JSON.stringify(aiOutput)
            });
        }

        return NextResponse.json(aiOutput);

    } catch (error: any) {
        console.error("Resume Analysis Error Detail:", {
            message: error.message,
            stack: error.stack,
            response: error.response?.data
        });
        return NextResponse.json({
            error: "Failed to analyze resume. Please try again later."
        }, { status: 500 });
    }
}
