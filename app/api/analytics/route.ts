import { NextResponse } from 'next/server';
import { db } from '@/configs/db';
import { doubtsTable, repliesTable, membershipsTable } from '@/configs/schema';
import { desc, sql, and, isNull, eq, count, countDistinct, ne } from 'drizzle-orm';
import { currentUser } from '@clerk/nextjs/server';
import { checkUserBlock } from '@/lib/auth-utils';

export async function GET(req: Request) {
    const user = await currentUser();
    if (!user || !user.primaryEmailAddress?.emailAddress) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = user.primaryEmailAddress.emailAddress;

    // Check if user is blocked
    const { isBlocked, errorResponse } = await checkUserBlock(email);
    if (isBlocked) return errorResponse;

    const { searchParams } = new URL(req.url);
    const classroomIdStr = searchParams.get("classroomId");
    const classroomId = classroomIdStr ? parseInt(classroomIdStr) : null;

    if (!classroomId) {
        return NextResponse.json({ error: "Classroom ID required" }, { status: 400 });
    }

    // Verify the user is a member of this classroom
    const [membership] = await db.select().from(membershipsTable).where(
        and(
            eq(membershipsTable.userEmail, email),
            eq(membershipsTable.classroomId, classroomId)
        )
    );

    if (!membership) {
        return NextResponse.json({ error: 'Access denied: not a member of this classroom' }, { status: 403 });
    }

    try {
        // 1. Trending Doubts
        const trendingDoubts = await db.select({
            id: doubtsTable.id,
            content: doubtsTable.content,
            subject: doubtsTable.subject,
            createdAt: doubtsTable.createdAt
        })
            .from(doubtsTable)
            .where(eq(doubtsTable.classroomId, classroomId))
            .orderBy(desc(doubtsTable.createdAt))
            .limit(5);

        // 2. Most Asked Topics (Doubt Volume)
        const mostAskedTopics = await db.select({
            subject: doubtsTable.subject,
            count: count(doubtsTable.id)
        })
            .from(doubtsTable)
            .where(eq(doubtsTable.classroomId, classroomId))
            .groupBy(doubtsTable.subject)
            .orderBy(desc(count(doubtsTable.id)))
            .limit(10);

        // 3. Resolved vs Unresolved
        const solvedStats = await db.select({
            status: doubtsTable.isSolved,
            count: count(doubtsTable.id)
        })
            .from(doubtsTable)
            .where(eq(doubtsTable.classroomId, classroomId))
            .groupBy(doubtsTable.isSolved);

        // 4. Peak Doubt Time (Hourly)
        // Note: 'extract' is standard for PostgreSQL
        const peakTime = await db.select({
            hour: sql<number>`extract(hour from ${doubtsTable.createdAt})`,
            count: count(doubtsTable.id)
        })
            .from(doubtsTable)
            .where(eq(doubtsTable.classroomId, classroomId))
            .groupBy(sql`extract(hour from ${doubtsTable.createdAt})`)
            .orderBy(sql`extract(hour from ${doubtsTable.createdAt})`);

        // 5. Student Engagement
        const engagement = await db.select({
            totalStudents: countDistinct(doubtsTable.userName),
            totalDoubts: count(doubtsTable.id)
        })
            .from(doubtsTable)
            .where(eq(doubtsTable.classroomId, classroomId));
            
        const totalReplies = await db.select({
            count: count(repliesTable.id)
        })
            .from(repliesTable)
            .innerJoin(doubtsTable, eq(repliesTable.doubtId, doubtsTable.id))
            .where(eq(doubtsTable.classroomId, classroomId));

        // 6. Top Contributors (students who reply the most)
        const topContributors = await db.select({
            name: repliesTable.userName,
            replyCount: count(repliesTable.id)
        })
            .from(repliesTable)
            .innerJoin(doubtsTable, eq(repliesTable.doubtId, doubtsTable.id))
            .where(and(
                eq(doubtsTable.classroomId, classroomId),
                ne(repliesTable.userName, 'DoubtDesk AI')
            ))
            .groupBy(repliesTable.userName)
            .orderBy(desc(count(repliesTable.id)))
            .limit(5);

        // 7. AI Teaching Suggestions & Weak Concept Detection (Heuristics)
        const weakTopics = mostAskedTopics.map((topic, index) => {
            const countValue = Number(topic.count);
            let suggestion = "";
            
            const subjectsMap: Record<string, string> = {
                'Programming': 'Consider dynamic coding demonstrations and live-refactoring sessions.',
                'Math': 'Focus on step-by-step problem derivation and visual geometry proofs.',
                'Calculus': 'Visualize derivatives and integrals with interactive graphs or animations.',
                'Recursion': 'Use tree diagrams and stack-overflow visualizers to trace execution flow.',
                'Physics': 'Relate equations to real-world mechanical examples or lab experiments.',
                'Chemistry': 'Use molecular modeling tools to explain bonding and reaction mechanisms.',
                'Biology': 'Utilize high-definition diagrams or 3D models for anatomical topics.',
                'Data Structures': 'Implement hands-on whiteboarding for pointer-heavy concepts like Linked Lists.',
                'Algorithms': 'Analyze time complexity through comparison of different sorting visualizers.',
                'Operating Systems': 'Simulate process scheduling and memory management scenarios.'
            };

            const baseStyle = subjectsMap[topic.subject] || 'Provide additional comprehensive practice resources and summary sheets.';

            if (countValue > 15) {
                suggestion = `Critical Alert: ${topic.subject} has reached a high doubt density. ${baseStyle} A dedicated doubt clearing session is essential immediately.`;
            } else if (countValue > 7) {
                suggestion = `Key Observation: Students are showing consistent patterns of confusion in ${topic.subject}. ${baseStyle} Consider a quick 10-minute recap in your next class.`;
            } else if (countValue > 3) {
                suggestion = `Pedagogical Note: Interest or slight confusion is emerging in ${topic.subject}. ${baseStyle} Share supplementary reading materials to maintain momentum.`;
            } else {
                suggestion = `Pulse Check: Student grasp of ${topic.subject} appears stable for now. Continue with the current curriculum plan while offering advanced elective challenges.`;
            }

            return {
                ...topic,
                count: countValue,
                severity: countValue > 15 ? 'High' : countValue > 7 ? 'Medium' : 'Low',
                suggestion
            };
        });

        return NextResponse.json({
            trendingDoubts,
            mostAskedTopics: weakTopics, 
            solvedStats,
            peakTime,
            engagement: {
                ...engagement[0],
                totalReplies: totalReplies[0]?.count || 0
            },
            weakTopics: weakTopics.filter(t => t.severity !== 'Low'),
            topContributors: topContributors.map(c => ({ name: c.name, replyCount: Number(c.replyCount) }))
        });

    } catch (error: any) {
        console.error('Error fetching analytics:', error);
        return NextResponse.json({
            trendingDoubts: [],
            mostAskedTopics: [],
            solvedStats: [],
            peakTime: [],
            engagement: { totalStudents: 0, totalDoubts: 0, totalReplies: 0 },
            weakTopics: [],
            topContributors: []
        });
    }
}
