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
  const buffer = await clone.arrayBuffer();
  if (buffer.byteLength > maxBytes) {
    return NextResponse.json(
      { error: "Request body too large", code: "REQUEST_TOO_LARGE" },
      { status: 413 }
    );
  }

  return null;
}

export async function parseAndValidateRequest<T>(req: Request, schema: ZodSchema<T>) {
  const sizeError = await limitRequestBodySize(req);
  if (sizeError) {
    return { errorResponse: sizeError, data: null };
  }

  let body;
  try {
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
