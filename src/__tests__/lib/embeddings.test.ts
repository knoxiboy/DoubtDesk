process.env.GROQ_API_KEY = "mock-groq-key";

import { safeGenerateEmbedding, findSemanticDuplicates } from "@/lib/ai/embeddings";
import { groq } from "@/lib/ai/groq-client";
import { db } from "@/configs/db";

jest.mock("@/lib/ai/groq-client", () => ({
  groq: {
    embeddings: {
      create: jest.fn(),
    },
  },
}));

jest.mock("@/configs/db", () => ({
  db: {
    select: jest.fn(() => ({
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    })),
  },
}));

describe("Embeddings & Vector Duplicate Utilities", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("safeGenerateEmbedding returns vector array when Groq embeddings succeeds", async () => {
    const mockVector = new Array(1536).fill(0.1);
    (groq.embeddings.create as jest.Mock).mockResolvedValueOnce({
      data: [{ embedding: mockVector }],
    });

    const result = await safeGenerateEmbedding("What is calculus?");
    expect(result).toEqual(mockVector);
    expect(groq.embeddings.create).toHaveBeenCalledWith({
      model: "nomic-embed-text",
      input: "What is calculus?",
      encoding_format: "float",
    });
  });

  it("safeGenerateEmbedding returns null safely on error", async () => {
    (groq.embeddings.create as jest.Mock).mockRejectedValueOnce(new Error("API rate limit"));

    const result = await safeGenerateEmbedding("What is calculus?");
    expect(result).toBeNull();
  });

  it("findSemanticDuplicates returns empty list when no embedding generated", async () => {
    (groq.embeddings.create as jest.Mock).mockRejectedValueOnce(new Error("Network failure"));

    const duplicates = await findSemanticDuplicates({ content: "What is momentum?" });
    expect(duplicates).toEqual([]);
  });
});
