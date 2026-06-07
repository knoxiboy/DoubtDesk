import { NextResponse } from "next/server";
import { db } from "@/configs/db";
import { buildErrorResponse } from "@/lib/error-handler";
import { parseAndValidateRequest } from "@/lib/validations/validate";
import { createDoubtSchema } from "@/lib/validations/doubt";
import { getDoubts, createDoubt } from "@/services/doubt.service";
import { currentUser } from "@clerk/nextjs/server";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const subject = searchParams.get("subject");
    const search = searchParams.get("search");
    const userName = searchParams.get("userName");
    const classroomIdStr = searchParams.get("classroomId");
    const type = searchParams.get("type") || "community";
    const tag = searchParams.get("tag");
    const sort = searchParams.get("sort") || "newest";
    const bookmarked = searchParams.get("bookmarked") === "true";
    const pageStr = searchParams.get("page");
    const limitStr = searchParams.get("limit");
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 20;

    try {
        const user = await currentUser();
        const email = user?.primaryEmailAddress?.emailAddress ?? null;
        const classroomId = classroomIdStr ? parseInt(classroomIdStr) : null;

        if (classroomId) {
            if (!email) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
        }

        if ((type === "ai" || bookmarked) && !email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const doubts = await getDoubts(db, {
            email,
            subject,
            search,
            userName,
            classroomId,
            type,
            tag,
            sort,
            bookmarked,
            page,
            limit
        });

        return NextResponse.json(doubts);
    } catch (error) {
        const { status, body } = buildErrorResponse(error);
        return NextResponse.json(body, { status });
    }
}

export async function POST(req: Request) {
    try {
        const { errorResponse: validationResponse, data } = await parseAndValidateRequest(req, createDoubtSchema);
        if (validationResponse) return validationResponse;
        
        const user = await currentUser();
        const email = user?.primaryEmailAddress?.emailAddress;

        if (!email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const parsedClassroomId = data.classroomId ? parseInt(data.classroomId.toString(), 10) : null;

        let parsedCreatedAt: Date | undefined = undefined;
        if (data.createdAt) {
            const d = new Date(data.createdAt);
            if (isNaN(d.getTime())) {
                return NextResponse.json({ error: "Invalid createdAt date format" }, { status: 400 });
            }
            const now = new Date();
            const age = now.getTime() - d.getTime();
            const maxOfflineDuration = 30 * 24 * 60 * 60 * 1000; // 30 days
            if (age >= -300000 && age <= maxOfflineDuration) {
                parsedCreatedAt = d;
            }
        }

        const newDoubt = await createDoubt(db, {
            email,
            userName: data.userName,
            subject: data.subject,
            content: data.content,
            imageUrl: data.imageUrl,
            classroomId: parsedClassroomId,
            type: data.type,
            tags: data.tags,
            createdAt: parsedCreatedAt
        });

        return NextResponse.json(newDoubt);
    } catch (error) {
        const { status, body } = buildErrorResponse(error);
        return NextResponse.json(body, { status });
    }
}
