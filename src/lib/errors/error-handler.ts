/**
 * Centralised API response helpers.
 *
 * - In production (NODE_ENV === 'production'): sanitises all errors into a
 *   generic message so that no stack traces, SQL fragments, or internal
 *   library details ever reach the client.
 * - In development: includes the error message / stack to aid local debugging.
 */

import { NextResponse } from "next/server";
import type { ZodError } from "zod";

const isProduction = process.env.NODE_ENV === "production";

export class ApiError extends Error {
    constructor(
        public statusCode: number,
        message: string,
        public details?: unknown
    ) {
        super(message);
        this.name = "ApiError";
    }
}

export function createApiError(statusCode: number, message: string, details?: unknown): ApiError {
    return new ApiError(statusCode, message, details);
}

interface SanitisedError {
    statusCode: number;
    message: string;
    details?: unknown;
    stack?: string[];
}

export function sanitizeError(error: unknown): SanitisedError {
    if (error instanceof ApiError) {
        return {
            statusCode: error.statusCode,
            message: isProduction ? "An internal error occurred." : error.message,
            ...(isProduction ? {} : { details: error.details }),
            ...(isProduction ? {} : error.stack ? { stack: error.stack.split("\n") } : {}),
        };
    }

    if (error instanceof Error) {
        return {
            statusCode: 500,
            message: isProduction ? "An internal error occurred." : error.message,
            ...(!isProduction && error.stack ? { stack: error.stack.split("\n") } : {}),
        };
    }

    return {
        statusCode: 500,
        message: isProduction ? "An internal error occurred." : String(error),
    };
}

export function buildErrorResponse(error: unknown) {
    const result = sanitizeError(error);
    const body: Record<string, unknown> = { error: result.message };
    if (result.details !== undefined) body.details = result.details;
    if (result.stack !== undefined) body.stack = result.stack;
    const status = result.statusCode;
    return { status, body } as { status: number; body: Record<string, unknown> };
}

export function successResponse<T>(data: T, status = 200) {
    return NextResponse.json(data, { status });
}

export function errorResponse(
    message: string,
    status = 500,
    details?: unknown,
    extraFields: Record<string, unknown> = {}
) {
    const body: Record<string, unknown> = { error: message, ...extraFields };
    if (details !== undefined) body.details = details;
    return NextResponse.json(body, { status });
}

export function validationErrorResponse(error: ZodError) {
    return NextResponse.json(
        {
            success: false,
            error: "Validation failed",
            details: error.flatten(),
        },
        { status: 400 }
    );
}
