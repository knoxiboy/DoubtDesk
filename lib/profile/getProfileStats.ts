import { db } from "@/configs/db";
import { doubtsTable, repliesTable, usersTable } from "@/configs/schema";
import { eq, or, sql, desc, count, sum } from "drizzle-orm";

export async function getProfileStats(email: string, userName: string) {
    const doubtQuery = db.select({
        totalDoubts: count(doubtsTable.id),
        totalLikesReceived: sum(doubtsTable.likes).mapWith(Number),
        doubtsSolved: sql<number>`coalesce(sum(case when ${doubtsTable.isSolved} = 'solved' then 1 else 0 end), 0)`.mapWith(Number),
    }).from(doubtsTable).where(eq(doubtsTable.userEmail, email));

    const replyQuery = db.select({
        totalReplies: count(repliesTable.id),
        totalReplyUpvotes: sum(repliesTable.upvotes).mapWith(Number),
    }).from(repliesTable).where(or(eq(repliesTable.userEmail, email), eq(repliesTable.userName, userName)));

    const subjectQuery = db.select({
        subject: doubtsTable.subject,
        subjectCount: count(doubtsTable.id)
    }).from(doubtsTable)
      .where(eq(doubtsTable.userEmail, email))
      .groupBy(doubtsTable.subject)
      .orderBy(desc(count(doubtsTable.id)))
      .limit(1);

    const userQuery = db.select({
        createdAt: usersTable.createdAt
    }).from(usersTable).where(eq(usersTable.email, email)).limit(1);

    const [doubtResult, replyResult, subjectResult, userResult] = await Promise.all([
        doubtQuery,
        replyQuery,
        subjectQuery,
        userQuery
    ]);

    const totalDoubts = doubtResult[0]?.totalDoubts || 0;
    const totalLikesReceived = doubtResult[0]?.totalLikesReceived || 0;
    const doubtsSolved = doubtResult[0]?.doubtsSolved || 0;

    const totalReplies = replyResult[0]?.totalReplies || 0;
    const totalReplyUpvotes = replyResult[0]?.totalReplyUpvotes || 0;

    const mostActiveSubject = subjectResult[0]?.subject || null;
    const userCreatedAt = userResult[0]?.createdAt || null;

    return {
        totalDoubts,
        totalReplies,
        totalLikesReceived,
        totalReplyUpvotes,
        doubtsSolved,
        mostActiveSubject,
        userCreatedAt,
    };
}