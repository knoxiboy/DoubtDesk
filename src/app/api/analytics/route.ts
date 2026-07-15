import { NextResponse, after } from 'next/server';
import { db } from '@/configs/db';
import { doubtsTable, repliesTable, membershipsTable, classroomsTable, organizationMembershipsTable } from '@/configs/schema';
import { desc, sql, and, eq, count, countDistinct, ne, inArray, isNull, SQL } from 'drizzle-orm';
import { checkUserBlock } from '@/lib/auth/auth-utils';
import { buildErrorResponse, errorResponse } from '@/lib/errors/error-handler';
import {
    parseOptionalClassroomId,
    requireAuth,
    requireMembership,
} from '@/lib/auth/membership-guard';
import {
    buildAnalyticsCacheKey,
    readAnalyticsCache,
    writeAnalyticsCache,
    acquireAnalyticsLock,
    releaseAnalyticsLock,
} from '@/lib/cache/analytics-cache';

type AnalyticsPayload = Awaited<ReturnType<typeof computeAnalyticsPayload>>;

async function computeAnalyticsPayload(activeClassroomIds: number[], classroomId: number | null) {
    const classroomFilter = and(inArray(doubtsTable.classroomId, activeClassroomIds), isNull(doubtsTable.deletedAt)) as SQL;

    // Run all queries in parallel to eliminate sequential query latency
    const [
        trendingDoubts,
        mostAskedTopics,
        solvedStats,
        peakTime,
        engagement,
        totalReplies,
        topContributors,
        recentAIReplies
    ] = await Promise.all([
        // 1. Trending Doubts
        db.select({
            id: doubtsTable.id,
            content: doubtsTable.content,
            subject: doubtsTable.subject,
            createdAt: doubtsTable.createdAt
        })
            .from(doubtsTable)
            .where(classroomFilter)
            .orderBy(desc(doubtsTable.createdAt))
            .limit(5),

        // 2. Most Asked Topics (Doubt Volume)
        db.select({
            subject: doubtsTable.subject,
            count: count(doubtsTable.id)
        })
            .from(doubtsTable)
            .where(classroomFilter)
            .groupBy(doubtsTable.subject)
            .orderBy(desc(count(doubtsTable.id)))
            .limit(10),

        // 3. Resolved vs Unresolved
        db.select({
            status: doubtsTable.isSolved,
            count: count(doubtsTable.id)
        })
            .from(doubtsTable)
            .where(classroomFilter)
            .groupBy(doubtsTable.isSolved),

        // 4. Peak Doubt Time (Hourly)
        db.select({
            hour: sql<number>`extract(hour from ${doubtsTable.createdAt})`,
            count: count(doubtsTable.id)
        })
            .from(doubtsTable)
            .where(classroomFilter)
            .groupBy(sql`extract(hour from ${doubtsTable.createdAt})`)
            .orderBy(sql`extract(hour from ${doubtsTable.createdAt})`),

        // 5. Student Engagement
        db.select({
            totalStudents: countDistinct(doubtsTable.userEmail),
            totalDoubts: count(doubtsTable.id)
        })
            .from(doubtsTable)
            .where(classroomFilter),

        // 6. Total Replies
        db.select({
            count: count(repliesTable.id)
        })
            .from(repliesTable)
            .innerJoin(doubtsTable, eq(repliesTable.doubtId, doubtsTable.id))
            .where(classroomFilter),

        // 7. Top Contributors (students who reply the most)
        db.select({
            name: sql<string>`split_part(${repliesTable.userEmail}, '@', 1)`,
            replyCount: count(repliesTable.id)
        })
            .from(repliesTable)
            .innerJoin(doubtsTable, eq(repliesTable.doubtId, doubtsTable.id))
            .where(and(
                classroomFilter,
                ne(repliesTable.userEmail, 'ai@doubtdesk.com')
            ))
            .groupBy(repliesTable.userEmail)
            .orderBy(desc(count(repliesTable.id)))
            .limit(5),

        // 8. Recent AI replies for drift tracking
        db.select({
            id: repliesTable.id,
            doubtId: repliesTable.doubtId,
            doubtContent: doubtsTable.content,
            replyContent: repliesTable.content,
            gradeLevel: repliesTable.gradeLevel,
            complexityScore: repliesTable.complexityScore,
            readabilityScore: repliesTable.readabilityScore,
            pedagogyDrifted: repliesTable.pedagogyDrifted,
            driftExplanation: repliesTable.driftExplanation,
            createdAt: repliesTable.createdAt,
        })
            .from(repliesTable)
            .innerJoin(doubtsTable, eq(repliesTable.doubtId, doubtsTable.id))
            .where(and(
                classroomFilter,
                eq(repliesTable.userEmail, 'ai@doubtdesk.com'),
                eq(repliesTable.type, 'solution')
            ))
            .orderBy(desc(repliesTable.createdAt))
            .limit(20),
    ]);

    // AI Teaching Suggestions & Weak Concept Detection (Heuristics)
    const weakTopics = mostAskedTopics.map((topic: any) => {
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

    let classroomSettings = {
        pedagogyLevel: "Undergraduate (Freshman)",
        targetGradeLevel: 13
    };
    // Only fetch single classroom settings if it is specifically requested (and not an org request)
    if (classroomId !== null) {
        try {
            const [classroom] = await db.select({
                pedagogyLevel: classroomsTable.pedagogyLevel,
                targetGradeLevel: classroomsTable.targetGradeLevel
            }).from(classroomsTable).where(eq(classroomsTable.id, classroomId));
            if (classroom) {
                classroomSettings = classroom;
            }
        } catch (err) {
            console.error("Failed to query classroom settings for analytics:", err);
        }
    }

    return {
        trendingDoubts,
        mostAskedTopics: weakTopics,
        solvedStats,
        peakTime,
        engagement: {
            ...engagement[0],
            totalReplies: totalReplies[0]?.count || 0
        },
        weakTopics: weakTopics.filter((t: any) => t.severity !== 'Low'),
        topContributors: topContributors.map((c: any) => ({ name: c.name, replyCount: Number(c.replyCount) })),
        classroomSettings,
        recentAIReplies: recentAIReplies || []
    };
}

export async function GET(req: Request) {
    try {
        const { email } = await requireAuth();
        const { isBlocked, errorResponse: blockErrorResponse } = await checkUserBlock(email);
        if (isBlocked) return blockErrorResponse;

        const { searchParams } = new URL(req.url);
        const classroomId = parseOptionalClassroomId(searchParams.get("classroomId"));
        
        // FIXED: Strictly validate organizationId and normalize scopes
        const orgIdParam = searchParams.get("organizationId");
        const organizationId = orgIdParam === null || orgIdParam === "" ? null : Number(orgIdParam);

        if (organizationId !== null && (!Number.isSafeInteger(organizationId) || organizationId <= 0)) {
            return errorResponse('Invalid organizationId', 400);
        }

        if (organizationId !== null && classroomId !== null) {
            return errorResponse('Specify either organizationId or classroomId, not both', 400);
        }

        let activeClassroomIds: number[] = [];

        // 1. ORGANIZATION LEVEL SCOPING
        if (organizationId !== null) {
            const orgId = organizationId;
            
            // Verify org membership and role
            const [orgMembership] = await db.select()
                .from(organizationMembershipsTable)
                .where(and(
                    eq(organizationMembershipsTable.organizationId, orgId),
                    eq(organizationMembershipsTable.userEmail, email)
                ));

            if (!orgMembership || !['owner', 'admin', 'teacher'].includes(orgMembership.role)) {
                return errorResponse('Forbidden: Invalid tenant membership privileges', 403);
            }

            // Get all classrooms belonging to this organization
            const orgClassrooms = await db.select({ id: classroomsTable.id })
                .from(classroomsTable)
                .where(eq(classroomsTable.organizationId, orgId));

            activeClassroomIds = orgClassrooms.map((c: any) => c.id);
        } 
        // 2. CLASSROOM LEVEL SCOPING
        else if (classroomId !== null) {
            await requireMembership(email, classroomId);
            activeClassroomIds = [classroomId];
        } 
        // 3. GLOBAL FALLBACK (All user's joined classrooms)
        else {
            const userMemberships = await db.select({ classroomId: membershipsTable.classroomId })
                .from(membershipsTable)
                .where(eq(membershipsTable.userEmail, email));
            activeClassroomIds = userMemberships.map((m: any) => m.classroomId);
        }

        // Return empty state if no classrooms are found for the given scope
        if (activeClassroomIds.length === 0) {
            return NextResponse.json({
                trendingDoubts: [],
                mostAskedTopics: [],
                solvedStats: [],
                peakTime: [],
                engagement: { totalStudents: 0, totalDoubts: 0, totalReplies: 0 },
                weakTopics: [],
                topContributors: [],
                classroomSettings: {
                    pedagogyLevel: "Undergraduate (Freshman)",
                    targetGradeLevel: 13
                },
                recentAIReplies: []
            });
        }

        // Determine a stable cache scope/key. Each scope (organization,
        // single classroom, or a user's own "all my classrooms" view)
        // is cached independently so one teacher's dashboard refresh
        // doesn't serve another org's numbers.
        const cacheKey = organizationId !== null
            ? buildAnalyticsCacheKey({ type: 'organization', id: organizationId })
            : classroomId !== null
                ? buildAnalyticsCacheKey({ type: 'classroom', id: classroomId })
                : buildAnalyticsCacheKey({ type: 'global', id: email });

        const cached = await readAnalyticsCache<AnalyticsPayload>(cacheKey);

        if (cached.status === 'fresh') {
            return NextResponse.json(cached.data);
        }

        if (cached.status === 'stale') {
            // Serve the stale data immediately, then refresh the cache
            // in the background (stale-while-revalidate) so the next
            // request gets fresh numbers without anyone paying the
            // 8-query latency synchronously. A lock ensures only one
            // in-flight request actually revalidates per key - if a
            // refresh is already running, other concurrent stale hits
            // just keep serving the current stale data.
            after(async () => {
                const acquiredLock = await acquireAnalyticsLock(cacheKey);
                if (!acquiredLock) return;
                try {
                    const fresh = await computeAnalyticsPayload(activeClassroomIds, classroomId);
                    await writeAnalyticsCache(cacheKey, fresh);
                } catch (err) {
                    console.error('Background analytics revalidation failed:', err);
                } finally {
                    await releaseAnalyticsLock(cacheKey);
                }
            });
            return NextResponse.json(cached.data);
        }

        // Cache miss: try to be the single request that computes this key,
        // to avoid a stampede of identical DB reads when many requests hit
        // a cold/expired key at once.
        const acquiredLock = await acquireAnalyticsLock(cacheKey);

        if (!acquiredLock) {
            // Another request is already computing this key - poll briefly
            // for it to land in the cache instead of also hitting the DB.
            for (let attempt = 0; attempt < 5; attempt++) {
                await new Promise((resolve) => setTimeout(resolve, 300));
                const retry = await readAnalyticsCache<AnalyticsPayload>(cacheKey);
                if (retry.status === 'fresh' || retry.status === 'stale') {
                    return NextResponse.json(retry.data);
                }
            }
            // Gave up waiting - fall through and compute directly rather
            // than leaving this request empty-handed.
        }

        try {
            const payload = await computeAnalyticsPayload(activeClassroomIds, classroomId);
            await writeAnalyticsCache(cacheKey, payload);
            return NextResponse.json(payload);
        } finally {
            if (acquiredLock) {
                await releaseAnalyticsLock(cacheKey);
            }
        }

    } catch (error: unknown) {
        const { status, body } = buildErrorResponse(error);
        return NextResponse.json(body, { status });
    }
}
