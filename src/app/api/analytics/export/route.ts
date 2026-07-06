import { NextResponse } from "next/server";
import { db } from "@/configs/db";
import { requireTeacher } from "@/lib/auth/membership-guard";
import {
  doubtsTable,
  repliesTable,
  membershipsTable,
  classroomsTable,
} from "@/configs/schema";
import {
  desc,
  sql,
  and,
  isNull,
  eq,
  count,
  countDistinct,
  ne,
  inArray,
} from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import { checkUserBlock } from "@/lib/auth-utils";

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user || !user.primaryEmailAddress?.emailAddress) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = user.primaryEmailAddress.emailAddress;

  // Check if user is blocked
  const { isBlocked, errorResponse } = await checkUserBlock(email);
  if (isBlocked) return errorResponse;

  const { searchParams } = new URL(req.url);
  const classroomIdStr = searchParams.get("classroomId");
  const classroomId = classroomIdStr ? parseInt(classroomIdStr) : null;

  let classroomFilter;

  if (classroomId) {
    // Verify the user is a member of this classroom
    await requireTeacher(email, classroomId);

    classroomFilter = eq(doubtsTable.classroomId, classroomId);
  } else {
    // Get all classrooms user is a member of
    const userMemberships = await db
      .select({ classroomId: membershipsTable.classroomId })
      .from(membershipsTable)
      .where(eq(membershipsTable.userEmail, email));

    const userClassroomIds = userMemberships.map((m: any) => m.classroomId);

    if (userClassroomIds.length === 0) {
      return NextResponse.json({
        message: "Export route working",
      });
    }

    classroomFilter = inArray(doubtsTable.classroomId, userClassroomIds);
  }

  try {
    // Run all queries in parallel to eliminate sequential query latency
    const [
      trendingDoubts,
      mostAskedTopics,
      solvedStats,
      peakTime,
      engagement,
      totalReplies,
      topContributors,
      recentAIReplies,
    ] = await Promise.all([
      // 1. Trending Doubts
      db
        .select({
          id: doubtsTable.id,
          content: doubtsTable.content,
          subject: doubtsTable.subject,
          createdAt: doubtsTable.createdAt,
        })
        .from(doubtsTable)
        .where(classroomFilter)
        .orderBy(desc(doubtsTable.createdAt))
        .limit(5),

      // 2. Most Asked Topics (Doubt Volume)
      db
        .select({
          subject: doubtsTable.subject,
          count: count(doubtsTable.id),
        })
        .from(doubtsTable)
        .where(classroomFilter)
        .groupBy(doubtsTable.subject)
        .orderBy(desc(count(doubtsTable.id)))
        .limit(10),

      // 3. Resolved vs Unresolved
      db
        .select({
          status: doubtsTable.isSolved,
          count: count(doubtsTable.id),
        })
        .from(doubtsTable)
        .where(classroomFilter)
        .groupBy(doubtsTable.isSolved),

      // 4. Peak Doubt Time (Hourly)
      db
        .select({
          hour: sql<number>`extract(hour from ${doubtsTable.createdAt})`,
          count: count(doubtsTable.id),
        })
        .from(doubtsTable)
        .where(classroomFilter)
        .groupBy(sql`extract(hour from ${doubtsTable.createdAt})`)
        .orderBy(sql`extract(hour from ${doubtsTable.createdAt})`),

      // 5. Student Engagement
      db
        .select({
          totalStudents: countDistinct(doubtsTable.userEmail),
          totalDoubts: count(doubtsTable.id),
        })
        .from(doubtsTable)
        .where(classroomFilter),

      // 6. Total Replies
      db
        .select({
          count: count(repliesTable.id),
        })
        .from(repliesTable)
        .innerJoin(doubtsTable, eq(repliesTable.doubtId, doubtsTable.id))
        .where(classroomFilter),

      // 7. Top Contributors (students who reply the most)
      db
        .select({
          name: repliesTable.userEmail,
          replyCount: count(repliesTable.id),
        })
        .from(repliesTable)
        .innerJoin(doubtsTable, eq(repliesTable.doubtId, doubtsTable.id))
        .where(and(classroomFilter, ne(repliesTable.userEmail, "DoubtDesk AI")))
        .groupBy(repliesTable.userEmail)
        .orderBy(desc(count(repliesTable.id)))
        .limit(5),

      // 8. Recent AI replies for drift tracking
      db
        .select({
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
        .where(
          and(
            classroomFilter,
            eq(repliesTable.userEmail, "DoubtDesk AI"),
            eq(repliesTable.type, "solution"),
          ),
        )
        .orderBy(desc(repliesTable.createdAt))
        .limit(20),
    ]);

    // 8. AI Teaching Suggestions & Weak Concept Detection (Heuristics)
    const weakTopics = mostAskedTopics.map((topic: any, index: any) => {
      const countValue = Number(topic.count);
      let suggestion = "";

      const subjectsMap: Record<string, string> = {
        Programming:
          "Consider dynamic coding demonstrations and live-refactoring sessions.",
        Math: "Focus on step-by-step problem derivation and visual geometry proofs.",
        Calculus:
          "Visualize derivatives and integrals with interactive graphs or animations.",
        Recursion:
          "Use tree diagrams and stack-overflow visualizers to trace execution flow.",
        Physics:
          "Relate equations to real-world mechanical examples or lab experiments.",
        Chemistry:
          "Use molecular modeling tools to explain bonding and reaction mechanisms.",
        Biology:
          "Utilize high-definition diagrams or 3D models for anatomical topics.",
        "Data Structures":
          "Implement hands-on whiteboarding for pointer-heavy concepts like Linked Lists.",
        Algorithms:
          "Analyze time complexity through comparison of different sorting visualizers.",
        "Operating Systems":
          "Simulate process scheduling and memory management scenarios.",
      };

      const baseStyle =
        subjectsMap[topic.subject] ||
        "Provide additional comprehensive practice resources and summary sheets.";

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
        severity: countValue > 15 ? "High" : countValue > 7 ? "Medium" : "Low",
        suggestion,
      };
    });

    let classroomSettings = {
      pedagogyLevel: "Undergraduate (Freshman)",
      targetGradeLevel: 13,
    };
    if (classroomId) {
      try {
        const [classroom] = await db
          .select({
            pedagogyLevel: classroomsTable.pedagogyLevel,
            targetGradeLevel: classroomsTable.targetGradeLevel,
          })
          .from(classroomsTable)
          .where(eq(classroomsTable.id, classroomId));
        if (classroom) {
          classroomSettings = classroom;
        }
      } catch (err) {
        console.error("Failed to query classroom settings for analytics:", err);
      }
    }

    const analyticsData = {
      engagement: {
        ...engagement[0],
        totalReplies: totalReplies[0]?.count || 0,
      },
      solvedStats,
      weakTopics: weakTopics.filter((t: any) => t.severity !== "Low"),
      topContributors: topContributors.map((c: any) => ({
        name: c.name,
        replyCount: Number(c.replyCount),
      })),
      mostAskedTopics: weakTopics,
    };

    // Generate CSV
    let csv = "Metric,Value\n";

    csv += `Total Students,${analyticsData.engagement.totalStudents}\n`;
    csv += `Total Doubts,${analyticsData.engagement.totalDoubts}\n`;
    csv += `Total Replies,${analyticsData.engagement.totalReplies}\n`;

    csv += "\nStatus,Count\n";

    analyticsData.solvedStats.forEach((stat: any) => {
      let label = "Unknown";

      if (stat.status === "solved") {
        label = "Solved";
      } else if (stat.status === "unsolved") {
        label = "Unsolved";
      } else if (stat.status === "in-progress") {
        label = "In Progress";
      }

      csv += `${label},${stat.count}\n`;
    });

    csv += "\nContributor Name,Reply Count\n";
    analyticsData.topContributors.forEach((contributor: any) => {
      csv += `${contributor.name},${contributor.replyCount}\n`;
    });

    csv += "\nWeak Topic,Doubt Count,Severity\n";
    analyticsData.weakTopics.forEach((topic: any) => {
      csv += `${topic.subject},${topic.count},${topic.severity}\n`;
    });

    // Return CSV file
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="analytics-report.csv"',
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching analytics:", error);
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
        targetGradeLevel: 13,
      },
      recentAIReplies: [],
    });
  }
}
