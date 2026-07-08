import { NextResponse } from "next/server";
import { ZodSchema } from "zod";
import { validationErrorResponse } from "@/lib/errors/error-handler";

export async function parseAndValidateRequest<T>(req: Request, schema: ZodSchema<T>) {
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
