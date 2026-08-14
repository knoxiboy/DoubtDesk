import { NextResponse } from "next/server";
import { db } from "@/configs/db";
import { doubtsTable } from "@/configs/schema";
import { and, eq, gt, desc, sql, isNull } from "drizzle-orm";
import { safeGenerateEmbedding } from "@/lib/ai/embeddings";
import { currentUser } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content, classroomId } = await req.json();

    if (!content || content.length < 15) {
      return NextResponse.json({ similarDoubts: [] });
    }

    const embedding = await safeGenerateEmbedding(content);
    if (!embedding || embedding.length === 0) {
      return NextResponse.json({ similarDoubts: [] });
    }

    // Cast the embedding string directly in SQL to vector
    const similarity = sql<number>`(1 - (${doubtsTable.embedding} <=> ${JSON.stringify(embedding)}::vector)) * 100`;

    const matches = await db
      .select({
        id: doubtsTable.id,
        subject: doubtsTable.subject,
        content: doubtsTable.content,
        isSolved: doubtsTable.isSolved,
        similarity,
      })
      .from(doubtsTable)
      .where(
        and(
          classroomId 
            ? eq(doubtsTable.classroomId, classroomId) 
            : isNull(doubtsTable.classroomId),
          gt(similarity, 80) // 80% similarity threshold
        )
      )
      .orderBy(desc(similarity))
      .limit(3);

    return NextResponse.json({ similarDoubts: matches });
  } catch (error) {
    console.error("Semantic search failed:", error);
    return NextResponse.json(
      { error: "Semantic search failed" },
      { status: 500 }
    );
  }
}
