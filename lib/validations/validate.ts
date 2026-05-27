import { NextResponse } from "next/server";
import { ZodSchema } from "zod";

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
      data: null as any,
    };
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      errorResponse: NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      ),
      data: null as any,
    };
  }

  return { errorResponse: null, data: parsed.data };
}
