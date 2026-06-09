import { NextResponse } from 'next/server';
import { db } from '@/configs/db';

import { buildErrorResponse } from '@/lib/error-handler';
import { parseOptionalClassroomId, requireAuth } from '@/lib/auth/membership-guard';
import { getDashboardAnalytics } from "@/services/analytics.service";

export async function GET(req: Request) {
    try {
        const { email } = await requireAuth();

        const { searchParams } = new URL(req.url);
        const classroomId = parseOptionalClassroomId(searchParams.get("classroomId"));

        const analytics = await getDashboardAnalytics(db, {
            email,
            classroomId
        });

        return NextResponse.json(analytics);
    } catch (error: unknown) {
        const { status, body } = buildErrorResponse(error);
        return NextResponse.json(body, { status });
    }
}
