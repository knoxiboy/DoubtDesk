import { NextResponse } from 'next/server';
import { db } from '@/configs/db';
import { usersTable } from '@/configs/schema';
import { eq } from 'drizzle-orm';
import { auth, currentUser } from '@clerk/nextjs/server';

export async function POST(req: Request) {
    try {
        const { userId, sessionClaims } = await auth();
        
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Try to get email from session claims first (fastest)
        let email = (sessionClaims as any)?.email;

        // Fallback to currentUser if email not in claims
        if (!email) {
            console.log("Email not in claims, fetching via currentUser()...");
            const user = await currentUser();
            email = user?.primaryEmailAddress?.emailAddress;
        }

        if (!email) {
            return NextResponse.json({ error: 'User email not found' }, { status: 401 });
        }
        const { university, year, role, collegeEmail } = await req.json();

        if (!university || !role || !collegeEmail) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const finalYear = role === 'student' ? year : 'Staff/Faculty';

        if (role === 'student' && !year) {
            return NextResponse.json({ error: 'Academic year is required for students' }, { status: 400 });
        }

        // Update user in database
        await db.update(usersTable)
            .set({
                university,
                year: finalYear,
                role,
                collegeEmail,
                onboarded: true
            })
            .where(eq(usersTable.email, email));

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Onboarding error trace:', error);
        if (error.errors) {
            console.error('Clerk Detail Errors:', JSON.stringify(error.errors, null, 2));
        }
        return NextResponse.json(
            { error: error?.message || 'Failed to complete onboarding' },
            { status: 500 }
        );
    }
}
