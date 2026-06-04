export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/configs/db";
import { doubtsTable, repliesTable, classroomsTable, usersTable } from "@/configs/schema";
import { and, eq, inArray, gte, lte } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";
import { DoubtRecord, ReplyRecord } from "@/types";

export async function GET(req: NextRequest) {
    try {
        // 1. Authenticate user
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const clerkUser = await currentUser();
        const email = clerkUser?.primaryEmailAddress?.emailAddress;
        if (!email) {
            return NextResponse.json({ error: "No email found for Clerk user" }, { status: 400 });
        }

        // 2. Fetch user and check role
        const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.email, email));
        
        // Find if user is a teacher in classrooms even if role field is not fully populated
        const classroomsTaught = await db.select().from(classroomsTable).where(eq(classroomsTable.teacherEmail, email));
        
        const isTeacherOrAdmin = dbUser?.role === 'teacher' || dbUser?.role === 'admin' || classroomsTaught.length > 0;
        
        if (!isTeacherOrAdmin) {
            return NextResponse.json({ error: "Forbidden: Teachers or admins only" }, { status: 403 });
        }

        const role = dbUser?.role || "teacher";

        // 3. Parse query parameters
        const { searchParams } = new URL(req.url);
        const classroomIdStr = searchParams.get("classroomId");
        const classroomId = classroomIdStr && classroomIdStr !== "all" ? parseInt(classroomIdStr) : null;
        
        const startDateStr = searchParams.get("startDate");
        const endDateStr = searchParams.get("endDate");
        
        // Defaults to last 30 days
        const startDate = startDateStr ? new Date(startDateStr) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = endDateStr ? new Date(endDateStr) : new Date();

        // 4. Fetch available classrooms for filtering
        let classroomsList = [];
        if (role === 'admin') {
            classroomsList = await db.select({
                id: classroomsTable.id,
                name: classroomsTable.name,
                university: classroomsTable.university
            }).from(classroomsTable);
        } else {
            classroomsList = classroomsTaught.map(c => ({
                id: c.id,
                name: c.name,
                university: c.university
            }));
        }

        // Determine which classroom IDs we should query
        let selectedClassroomIds: number[] = [];
        if (classroomId) {
            // Check if teacher/admin is allowed to see this specific classroom
            if (role === 'admin' || classroomsList.some(c => c.id === classroomId)) {
                selectedClassroomIds = [classroomId];
            } else {
                return NextResponse.json({ error: "Forbidden: No access to this classroom" }, { status: 403 });
            }
        } else {
            selectedClassroomIds = classroomsList.map(c => c.id);
        }

        // 5. Query and Aggregate Data
        let doubts: DoubtRecord[] = [];
        let replies: ReplyRecord[] = [];
        let realDataUsed = false;

        if (selectedClassroomIds.length > 0) {
            doubts = await db.select()
                .from(doubtsTable)
                .where(
                    and(
                        inArray(doubtsTable.classroomId, selectedClassroomIds),
                        gte(doubtsTable.createdAt, startDate),
                        lte(doubtsTable.createdAt, endDate)
                    )
                );

            if (doubts.length > 0) {
                const doubtIds = doubts.map(d => d.id);
                replies = await db.select()
                    .from(repliesTable)
                    .where(inArray(repliesTable.doubtId, doubtIds));
                
                realDataUsed = doubts.length >= 3; // Use real data if we have at least 3 doubts
            }
        }

        // 6. Generate Response
        let summary = {
            totalDoubts: 0,
            solvedDoubts: 0,
            unsolvedDoubts: 0,
            activeStudents: 0,
            averageResponseTime: 0, // in minutes
            resolutionRate: 0, // %
        };

        let trends: { date: string; count: number }[] = [];
        let subjects: { subject: string; count: number }[] = [];
        let peakHours: { hour: string; count: number }[] = [];
        let solvedStats = [
            { name: "Solved", value: 0 },
            { name: "Unsolved", value: 0 }
        ];

        if (realDataUsed) {
            // Process real database data
            summary.totalDoubts = doubts.length;
            summary.solvedDoubts = doubts.filter(d => d.isSolved === "solved").length;
            summary.unsolvedDoubts = summary.totalDoubts - summary.solvedDoubts;
            summary.resolutionRate = summary.totalDoubts > 0 
                ? Math.round((summary.solvedDoubts / summary.totalDoubts) * 100) 
                : 0;

            solvedStats = [
                { name: "Solved", value: summary.solvedDoubts },
                { name: "Unsolved", value: summary.unsolvedDoubts }
            ];

            // Unique active students
            const uniqueStudents = new Set<string>();
            doubts.forEach(d => {
                if (d.userEmail) uniqueStudents.add(d.userEmail);
                else if (d.userName) uniqueStudents.add(d.userName);
            });
            replies.forEach(r => {
                if (r.userName && r.userName !== 'DoubtDesk AI' && r.userName !== dbUser?.name) {
                    uniqueStudents.add(r.userName);
                }
            });
            summary.activeStudents = uniqueStudents.size;

            // Average response time
            let responseTimesSum = 0;
            let doubtsWithRepliesCount = 0;
            doubts.forEach(doubt => {
                const doubtReplies = replies.filter(r => r.doubtId === doubt.id);
                if (doubtReplies.length > 0) {
                    const earliestReply = doubtReplies.reduce((prev, curr) => {
                        return new Date(prev.createdAt) < new Date(curr.createdAt) ? prev : curr;
                    });
                    const diffMs = new Date(earliestReply.createdAt).getTime() - new Date(doubt.createdAt).getTime();
                    const diffMins = Math.max(0, diffMs / (1000 * 60));
                    responseTimesSum += diffMins;
                    doubtsWithRepliesCount++;
                }
            });
            summary.averageResponseTime = doubtsWithRepliesCount > 0 
                ? Math.round(responseTimesSum / doubtsWithRepliesCount) 
                : 0;

            // Daily trends
            const trendsMap: Record<string, number> = {};
            doubts.forEach(d => {
                const dateKey = new Date(d.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                trendsMap[dateKey] = (trendsMap[dateKey] || 0) + 1;
            });
            trends = Object.entries(trendsMap).map(([date, count]) => ({ date, count }));

            // Subject wise distribution
            const subjectsMap: Record<string, number> = {};
            doubts.forEach(d => {
                subjectsMap[d.subject] = (subjectsMap[d.subject] || 0) + 1;
            });
            subjects = Object.entries(subjectsMap).map(([subject, count]) => ({ subject, count }))
                .sort((a, b) => b.count - a.count);

            // Hourly peak times
            const hoursMap: Record<string, number> = {};
            // Initialize hours
            for (let h = 8; h <= 22; h++) {
                const hourFormatted = `${h.toString().padStart(2, '0')}:00`;
                hoursMap[hourFormatted] = 0;
            }
            doubts.forEach(d => {
                const hour = new Date(d.createdAt).getHours();
                const hourFormatted = `${hour.toString().padStart(2, '0')}:00`;
                if (hour >= 8 && hour <= 22) {
                    hoursMap[hourFormatted] = (hoursMap[hourFormatted] || 0) + 1;
                }
            });
            peakHours = Object.entries(hoursMap).map(([hour, count]) => ({ hour, count }));
        } else {
            // Generate highly professional, beautiful dummy data for preview
            summary = {
                totalDoubts: 148,
                solvedDoubts: 112,
                unsolvedDoubts: 36,
                activeStudents: 32,
                averageResponseTime: 28, // 28 minutes average
                resolutionRate: 76,
            };

            solvedStats = [
                { name: "Solved", value: 112 },
                { name: "Unsolved", value: 36 }
            ];

            // Trends over the last 7 days
            const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
            const todayIndex = new Date().getDay(); // 0 is Sunday, 1 is Monday
            for (let i = 6; i >= 0; i--) {
                const dayIndex = (todayIndex - i + 7) % 7;
                // Add some realistic variation
                const count = [18, 24, 29, 15, 22, 8, 12][dayIndex];
                trends.push({
                    date: dayNames[dayIndex],
                    count: count
                });
            }

            // Subject Distribution
            subjects = [
                { subject: "Programming", count: 52 },
                { subject: "Calculus", count: 36 },
                { subject: "Physics", count: 28 },
                { subject: "Data Structures", count: 22 },
                { subject: "Operating Systems", count: 10 }
            ];

            // Peak Hours (8 AM to 10 PM)
            const hoursMockData = [
                { hour: "08:00", count: 4 },
                { hour: "10:00", count: 12 },
                { hour: "12:00", count: 24 },
                { hour: "14:00", count: 18 },
                { hour: "16:00", count: 15 },
                { hour: "18:00", count: 32 }, // Peak evening hour
                { hour: "20:00", count: 28 },
                { hour: "22:00", count: 15 }
            ];
            peakHours = hoursMockData;
        }

        return NextResponse.json({
            isDemoData: !realDataUsed,
            summary,
            trends,
            subjects,
            peakHours,
            solvedStats,
            classroomsList
        });
    } catch (error: unknown) {
        console.error("Teacher Analytics Endpoint failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
