import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse-fork");

export interface PDFExtractionOptions {
  /**
   * Minimal character threshold below which OCR fallback is triggered.
   * Default: 20
   */
  minTextThreshold?: number;
  /**
   * Whether to enable OCR fallback if standard text layer extraction fails or yields text below threshold.
   * Default: true
   */
  ocrFallback?: boolean;
  /**
   * Language to use for Tesseract OCR recognition.
   * Default: "eng"
   */
  ocrLanguage?: string;
  /**
   * Custom OCR handler function (e.g. for Vision AI payload processing or custom OCR worker).
   */
  customOcrHandler?: (buffer: Buffer) => Promise<string>;
}

export interface PDFExtractionResult {
  text: string;
  source: "text-layer" | "ocr-fallback" | "failed";
  isFallbackUsed: boolean;
  warning?: string | null;
  error?: string | null;
  pageCount?: number;
}

const DEFAULT_MIN_THRESHOLD = 20;
const DEFAULT_OCR_LANGUAGE = "eng";

/**
 * Performs OCR fallback using tesseract.js or a custom OCR handler.
 */
async function performOcrFallback(
  buffer: Buffer,
  options: PDFExtractionOptions
): Promise<string> {
  if (options.customOcrHandler) {
    return await options.customOcrHandler(buffer);
  }

  try {
    const { recognize } = require("tesseract.js");
    const lang = options.ocrLanguage || DEFAULT_OCR_LANGUAGE;
    const result = await recognize(buffer, lang);
    return result?.data?.text || "";
  } catch (ocrError: unknown) {
    console.error("[PDF Extractor] OCR Fallback Error:", ocrError);
    return "";
  }
}

/**
 * Extracts text from a PDF buffer using standard text layer extraction (pdf-parse-fork)
 * with automatic OCR fallback when extracted text is absent or below minimum threshold.
 */
export async function extractTextFromPDF(
  pdfBuffer: Buffer | Uint8Array,
  options: PDFExtractionOptions = {}
): Promise<PDFExtractionResult> {
  const minThreshold = options.minTextThreshold ?? DEFAULT_MIN_THRESHOLD;
  const ocrFallbackEnabled = options.ocrFallback ?? true;

  const buffer = Buffer.isBuffer(pdfBuffer)
    ? pdfBuffer
    : Buffer.from(pdfBuffer);

  let extractedText = "";
  let pageCount = 0;
  let pdfParseError: Error | null = null;

  try {
    const parsed = await pdfParse(buffer);
    extractedText = (parsed?.text || "").trim();
    pageCount = parsed?.numpages || 0;
  } catch (err: unknown) {
    pdfParseError = err instanceof Error ? err : new Error(String(err));
    console.warn("[PDF Extractor] Text layer parsing warning:", pdfParseError.message);
  }

  // Check if extracted text layer meets the minimum threshold
  if (extractedText.length >= minThreshold) {
    return {
      text: extractedText,
      source: "text-layer",
      isFallbackUsed: false,
      warning: null,
      error: null,
      pageCount,
    };
  }

  // If text layer is absent/insufficient and OCR fallback is disabled
  if (!ocrFallbackEnabled) {
    const warning = extractedText.length > 0
      ? `Extracted text length (${extractedText.length}) is below minimal threshold of ${minThreshold} characters.`
      : "No text layer found in PDF and OCR fallback is disabled.";

    return {
      text: extractedText,
      source: "text-layer",
      isFallbackUsed: false,
      warning,
      error: pdfParseError ? pdfParseError.message : null,
      pageCount,
    };
  }

  // Perform OCR Fallback
  const ocrText = (await performOcrFallback(buffer, options)).trim();

  if (ocrText.length >= minThreshold) {
    return {
      text: ocrText,
      source: "ocr-fallback",
      isFallbackUsed: true,
      warning: null,
      error: null,
      pageCount,
    };
  }

  // If both text layer and OCR yield insufficient / unreadable content
  const combinedText = ocrText.length > 0 ? ocrText : extractedText;
  const warningMsg = "PDF contains unreadable imagery or insufficient text layer. Please upload a clearer document or plain image.";

  return {
    text: combinedText,
    source: combinedText.length > 0 ? "ocr-fallback" : "failed",
    isFallbackUsed: true,
    warning: warningMsg,
    error: pdfParseError ? pdfParseError.message : null,
    pageCount,
  };
}
