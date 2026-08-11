import { extractTextFromPDF, PDFExtractionOptions } from "@/lib/pdf/extractor";

// Mock pdf-parse-fork
jest.mock("pdf-parse-fork", () => {
  return jest.fn((buffer: Buffer) => {
    const str = buffer.toString();
    if (str.includes("CORRUPTED")) {
      throw new Error("Invalid or corrupted PDF file");
    }
    if (str.includes("TEXT_LAYER_VALID")) {
      return Promise.resolve({
        text: "This is a valid PDF text layer containing plenty of readable math formulas and problem statements.",
        numpages: 3,
      });
    }
    if (str.includes("TEXT_LAYER_SHORT")) {
      return Promise.resolve({
        text: "Too short", // 9 chars < 20
        numpages: 1,
      });
    }
    // Default: empty text layer (scanned PDF)
    return Promise.resolve({
      text: "   ",
      numpages: 2,
    });
  });
});

// Mock tesseract.js
jest.mock("tesseract.js", () => ({
  recognize: jest.fn(async (buffer: Buffer, lang: string) => {
    const str = buffer.toString();
    if (str.includes("OCR_UNREADABLE")) {
      return { data: { text: "" } };
    }
    if (str.includes("OCR_FAIL")) {
      throw new Error("OCR engine failure");
    }
    return {
      data: {
        text: "Solved math equation: x^2 + 5x + 6 = 0, x = -2, -3",
      },
    };
  }),
}));

describe("PDF Extractor Module (src/lib/pdf/extractor.ts)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should extract text layer when text length is above minimal threshold (>= 20 chars)", async () => {
    const mockBuffer = Buffer.from("TEXT_LAYER_VALID");
    const result = await extractTextFromPDF(mockBuffer);

    expect(result.source).toBe("text-layer");
    expect(result.isFallbackUsed).toBe(false);
    expect(result.text).toContain("valid PDF text layer");
    expect(result.warning).toBeNull();
    expect(result.pageCount).toBe(3);
  });

  test("should trigger OCR fallback when text layer length is below minimal threshold (< 20 chars)", async () => {
    const mockBuffer = Buffer.from("TEXT_LAYER_SHORT"); // "Too short" (9 chars)
    const result = await extractTextFromPDF(mockBuffer, { minTextThreshold: 20 });

    expect(result.isFallbackUsed).toBe(true);
    expect(result.source).toBe("ocr-fallback");
    expect(result.text).toContain("Solved math equation");
    expect(result.warning).toBeNull();
  });

  test("should trigger OCR fallback when text layer is completely empty (scanned handwritten notes)", async () => {
    const mockBuffer = Buffer.from("SCANNED_HANDWRITTEN_MATH_NOTES");
    const result = await extractTextFromPDF(mockBuffer);

    expect(result.isFallbackUsed).toBe(true);
    expect(result.source).toBe("ocr-fallback");
    expect(result.text).toContain("x^2 + 5x + 6 = 0");
    expect(result.warning).toBeNull();
  });

  test("should return clear error/warning feedback when PDF imagery is unreadable", async () => {
    const mockBuffer = Buffer.from("OCR_UNREADABLE");
    const result = await extractTextFromPDF(mockBuffer);

    expect(result.isFallbackUsed).toBe(true);
    expect(result.warning).toBe("PDF contains unreadable imagery or insufficient text layer. Please upload a clearer document or plain image.");
  });

  test("should use custom Vision AI payload handler when provided in options", async () => {
    const mockBuffer = Buffer.from("SCANNED_MATH_SHEET");
    const customVisionAiHandler = jest.fn(async (_buf: Buffer) => {
      return "Vision AI Extracted: Int_{0}^{pi} sin(x) dx = 2";
    });

    const result = await extractTextFromPDF(mockBuffer, {
      customOcrHandler: customVisionAiHandler,
    });

    expect(customVisionAiHandler).toHaveBeenCalledTimes(1);
    expect(result.isFallbackUsed).toBe(true);
    expect(result.source).toBe("ocr-fallback");
    expect(result.text).toBe("Vision AI Extracted: Int_{0}^{pi} sin(x) dx = 2");
  });

  test("should respect ocrFallback: false option when text layer is below threshold", async () => {
    const mockBuffer = Buffer.from("TEXT_LAYER_SHORT");
    const result = await extractTextFromPDF(mockBuffer, { ocrFallback: false, minTextThreshold: 20 });

    expect(result.isFallbackUsed).toBe(false);
    expect(result.source).toBe("text-layer");
    expect(result.text).toBe("Too short");
    expect(result.warning).toContain("Extracted text length (9) is below minimal threshold");
  });

  test("should handle rejected custom OCR handler gracefully", async () => {
    const mockBuffer = Buffer.from("SCANNED_MATH_SHEET OCR_UNREADABLE");
    const failingHandler = jest.fn(async (_buf: Buffer) => {
      throw new Error("Custom Vision AI failed");
    });

    const result = await extractTextFromPDF(mockBuffer, {
      customOcrHandler: failingHandler,
    });

    expect(failingHandler).toHaveBeenCalledTimes(1);
    expect(result.isFallbackUsed).toBe(true);
    expect(result.warning).toBe("PDF contains unreadable imagery or insufficient text layer. Please upload a clearer document or plain image.");
  });

  test("should handle corrupted PDF gracefully and return error/warning message", async () => {
    const mockBuffer = Buffer.from("CORRUPTED_PDF_DATA OCR_UNREADABLE");
    const result = await extractTextFromPDF(mockBuffer);

    expect(result.isFallbackUsed).toBe(true);
    expect(result.error).toBe("Invalid or corrupted PDF file");
    expect(result.warning).toBe("PDF contains unreadable imagery or insufficient text layer. Please upload a clearer document or plain image.");
  });
});
