import Groq from "groq-sdk";
import { db } from "@/configs/db";
import { doubtsTable, repliesTable } from "@/configs/schema";
import { and, eq, isNull, desc, inArray, SQL, sql } from "drizzle-orm";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "dummy_key",
});

const EMBEDDING_DIMENSIONS = 1536;
const DEFAULT_SIMILARITY_THRESHOLD = 0.8; // cosine similarity
const DEFAULT_TOP_K = 5;

function getEmbeddingInput(content: string, subject?: string | null) {
  const c = content?.trim();
  const s = subject?.trim();
  if (s) return `${s}\n${c}`;
  return c || "";
}

async function generateGroqEmbedding(textInput: string): Promise<number[]> {
  const trimmed = textInput.trim();
  if (!trimmed) throw new Error("Empty embedding text");

  // Groq embeddings API returns vectors under `embedding`.
  // Docs: https://console.groq.com/docs/embeddings
  const res = await groq.embeddings.create({
    model: "nomic-embed-text",
    input: trimmed,
    encoding_format: "float",
  });

  const vector = (res.data?.[0]?.embedding || []) as number[];

  if (!Array.isArray(vector) || vector.length === 0) {
    throw new Error("Groq returned empty embedding");
  }

  if (vector.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Groq returned embedding dimension ${vector.length}, expected ${EMBEDDING_DIMENSIONS}`,
    );
  }

  return vector;
}

/**
 * Returns embedding vector for a text, or null if generation fails.
 */
export async function safeGenerateEmbedding(
  textInput: string,
): Promise<number[] | null> {
  try {
    const vector = await generateGroqEmbedding(textInput);
    return vector;
  } catch (err) {
    console.error("Embedding generation failed:", err);
    return null;
  }
}

export interface SemanticDuplicateCandidate {
  id: number;
  subject: string;
  content: string | null;
  isSolved: string | null;
  similarity: number;
  solvedAnswer?: string | null;
}

/**
 * Vector search across full doubt history for the same scope.
 *
 * Cosine similarity is computed using pgvector operator:
 *   embedding <=> query_embedding
 * returns (1 - cosine_similarity). Therefore cosine = 1 - distance.
 */
export async function findSemanticDuplicates(params: {
  content: string;
  classroomId?: number | null;
  subject?: string | null;
  similarityThreshold?: number;
  topK?: number;
  // Only search community doubts by default to match existing behavior
  type?: string;
}): Promise<SemanticDuplicateCandidate[]> {
  const {
    content,
    classroomId,
    subject,
    similarityThreshold = DEFAULT_SIMILARITY_THRESHOLD,
    topK = DEFAULT_TOP_K,
    type = "community",
  } = params;

  const embeddingInput = getEmbeddingInput(content, subject);
  const queryEmbedding = await safeGenerateEmbedding(embeddingInput);
  if (!queryEmbedding) return [];

  // pgvector expects an array of numbers cast to vector.
  // We pass as a SQL parameter via `sql`.
  const queryVec = sql`${queryEmbedding}::vector`;

  const whereClause = and(
    classroomId
      ? eq(doubtsTable.classroomId, classroomId)
      : isNull(doubtsTable.classroomId),
    eq(doubtsTable.type, type),
    // exclude null embeddings
    sql`${doubtsTable.embedding} IS NOT NULL`,
  );

  // pgvector cosine distance: (embedding <=> query) returns distance in [0..2] depending on normalization.
  // Existing code treated (1 - distance) as similarity, which is incorrect for a 0..100 % contract.
  // Convert cosine similarity (approx in [0..1]) to a 0..100 percentage.
  // Note: We clamp to [0,100] defensively.
  const similarityExpr = sql<number>`(
    greatest(0, least(100, (1 - (${doubtsTable.embedding} <=> ${queryVec})) * 100))
  )`;




  const rows = await db

    .select({
      id: doubtsTable.id,
      subject: doubtsTable.subject,
      content: doubtsTable.content,
      isSolved: doubtsTable.isSolved,
      similarity: similarityExpr,
      solvedReplyId: doubtsTable.solvedReplyId,
    })
    .from(doubtsTable)
    .where(whereClause)
    .orderBy(sql`${doubtsTable.embedding} <=> ${queryVec} ASC`)
    .limit(topK);


  const filtered = rows
    .filter((r) => typeof r.similarity === "number" && r.similarity >= similarityThreshold)
    .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0));

  const solvedReplyIds = filtered
    .filter((d) => d.isSolved === "solved" && d.solvedReplyId)
    .map((d) => d.solvedReplyId as number);

  const solvedReplies =
    solvedReplyIds.length > 0
      ? await db
          .select({ id: repliesTable.id, content: repliesTable.content })
          .from(repliesTable)
          .where(inArray(repliesTable.id, solvedReplyIds))
      : [];

  const replyMap = new Map<number, string | null>(
    solvedReplies.map((r) => [r.id, r.content]),
  );

  return filtered.map((d) => ({
    id: d.id,
    subject: d.subject,
    content: d.content,
    isSolved: d.isSolved,
    similarity: d.similarity,
    solvedAnswer:
      d.isSolved === "solved" && d.solvedReplyId
        ? replyMap.get(d.solvedReplyId) ?? null
        : null,
  }));
}

