import { NextResponse } from "next/server";
import { ZodSchema } from "zod";
import { validationErrorResponse } from "@/lib/errors/error-handler";

export const DEFAULT_REQUEST_BODY_LIMIT = 4 * 1024 * 1024;

export async function limitRequestBodySize(
  req: Request,
  maxBytes: number = DEFAULT_REQUEST_BODY_LIMIT
): Promise<NextResponse | null> {
  const contentLength = req.headers.get("content-length");
  if (contentLength !== null) {
    const declared = Number.parseInt(contentLength, 10);
    if (Number.isFinite(declared) && declared > maxBytes) {
      return NextResponse.json(
        { error: "Request body too large", code: "REQUEST_TOO_LARGE" },
        { status: 413 }
      );
    }
  }

  const clone = req.clone();
  const reader = clone.body?.getReader();
  if (!reader) {
    throw new Error("Unable to read request body");
  }

  let total = 0;
  for (;;) {
    const result = await reader.read();
    if (result.done) break;
    total += result.value.byteLength;
    if (total > maxBytes) {
      try { await reader.cancel(); } catch { /* ignore */ }
      return NextResponse.json(
        { error: "Request body too large", code: "REQUEST_TOO_LARGE" },
        { status: 413 }
      );
    }
  }

  return null;
}

export async function parseAndValidateRequest<T>(req: Request, schema: ZodSchema<T>) {
  let body;
  try {
    const sizeError = await limitRequestBodySize(req);
    if (sizeError) {
      return { errorResponse: sizeError, data: null };
    }
    body = await req.json();
  } catch (error) {
    return {
      errorResponse: NextResponse.json(
        { success: false, error: "Invalid JSON format" },
        { status: 400 }
      ),
      data: null,
    };
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      errorResponse: validationErrorResponse(parsed.error),
      data: null,
    };
  }

  return { errorResponse: null, data: parsed.data };
}
