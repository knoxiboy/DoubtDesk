import { NextResponse } from 'next/server';
import { db } from '@/configs/db';
import { usersTable } from '@/configs/schema';
import { eq } from 'drizzle-orm';
import { buildErrorResponse } from "@/lib/errors/error-handler";
import { auth, currentUser } from '@clerk/nextjs/server';
import { z } from 'zod';

const onboardingSchema = z.object({
    role: z.enum(['student', 'teacher']),
    university: z.string().trim().min(1, 'University name is required'),
    collegeEmail: z.string().trim().email('Invalid college email address'),
    year: z.string().trim().optional().nullable(),
    interests: z.string().trim().optional().nullable(),
    learningGoals: z.string().trim().optional().nullable(),
    subjects: z.string().trim().optional().nullable(),
    instituteInfo: z.string().trim().optional().nullable(),
}).refine(data => {
    if (data.role === 'student') {
        return !!data.year && data.year.length > 0;
    }
    return true;
}, {
    message: 'Academic year is required for students',
    path: ['year'],
});

export async function POST(req: Request) {
    try {
        const { userId, sessionClaims } = await auth();
        
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Try to get email from session claims first (fastest)
        let email: string | undefined = undefined;
        if (sessionClaims && typeof sessionClaims === "object" && "email" in sessionClaims) {
            email = (sessionClaims as Record<string, unknown>)["email"] as string | undefined;
        }

        // Fallback to currentUser if email not in claims
        if (!email) {
            console.log("Email not in claims, fetching via currentUser()...");
            const user = await currentUser();
            email = user?.primaryEmailAddress?.emailAddress;
        }

        if (!email) {
            return NextResponse.json({ error: 'User email not found' }, { status: 401 });
        }

        const body = await req.json();
        const parsed = onboardingSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.errors[0].message },
                { status: 400 }
            );
        }

        const {
            university,
            year,
            role,
            collegeEmail,
            interests,
            learningGoals,
            subjects,
            instituteInfo
        } = parsed.data;

        const finalYear = role === 'student' ? year! : 'Staff/Faculty';

        // Update user in database
        await db.update(usersTable)
            .set({
                university,
                year: finalYear,
                role,
                collegeEmail,
                interests: role === 'student' ? (interests || null) : null,
                learningGoals: role === 'student' ? (learningGoals || null) : null,
                subjects: role === 'teacher' ? (subjects || null) : null,
                instituteInfo: role === 'teacher' ? (instituteInfo || null) : null,
                onboarded: true
            })
            .where(eq(usersTable.email, email));

        return NextResponse.json({ success: true });

    } catch (error: unknown) {
        console.error('Onboarding error trace:', error);
        const { status, body } = buildErrorResponse(error);
        return NextResponse.json(body, { status });
    }
}
