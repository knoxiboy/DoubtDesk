import { NextResponse } from 'next/server';
import { db } from '@/configs/db';
import { checkUserBlock } from '@/lib/auth-utils';
import { buildErrorResponse } from '@/lib/error-handler';
import {
    parseClassroomId,
    requireAuth,
    requireMembership,
} from '@/lib/auth/membership-guard';
import { aiLimiter } from '@/lib/ratelimit';
import {
    buildAiProviderErrorResponse,
    enforceAiAvailability,
} from '@/lib/ai/kill-switch';
import {
    AI_REQUEST_MAX_BYTES,
    AI_REQUEST_MAX_SIZE_LABEL,
    validateAiImageDataUrl,
} from '@/lib/ai-image-validation';
import { generateAISolution } from "@/services/ai-solver.service";

function jsonError(
    error: string,
    status: number,
    code?: string,
    headers?: HeadersInit
) {
    return NextResponse.json(
        {
            error,
            ...(code ? { code } : {}),
        },
        { status, headers }
    );
}

async function readJsonWithLimit(req: Request) {
    const contentLength = Number(req.headers.get('content-length') || 0);

    if (contentLength > AI_REQUEST_MAX_BYTES) {
        return {
            ok: false as const,
            response: jsonError(
                `Requests must be ${AI_REQUEST_MAX_SIZE_LABEL} or smaller.`,
                413,
                'REQUEST_TOO_LARGE'
            ),
        };
    }

    if (!req.body) {
        return {
            ok: true as const,
            data: {},
        };
    }

    const reader = req.body.getReader();
    const decoder = new TextDecoder();
    const chunks: Uint8Array[] = [];
    let receivedBytes = 0;

    while (true) {
        const { done, value } = await reader.read();

        if (done) break;
        if (!value) continue;

        receivedBytes += value.byteLength;

        if (receivedBytes > AI_REQUEST_MAX_BYTES) {
            await reader.cancel();

            return {
                ok: false as const,
                response: jsonError(
                    `Requests must be ${AI_REQUEST_MAX_SIZE_LABEL} or smaller.`,
                    413,
                    'REQUEST_TOO_LARGE'
                ),
            };
        }

        chunks.push(value);
    }

    let rawBody = '';

    for (const chunk of chunks) {
        rawBody += decoder.decode(chunk, { stream: true });
    }

    rawBody += decoder.decode();

    try {
        return {
            ok: true as const,
            data: rawBody ? JSON.parse(rawBody) : {},
        };
    } catch {
        return {
            ok: false as const,
            response: jsonError(
                'Invalid JSON request body.',
                400,
                'INVALID_JSON'
            ),
        };
    }
}

/**
 * Main AI Solver API Route.
 */
// Maximum allowed Content-Length for this route in bytes.
// imageBase64 payloads are read entirely into memory before the slice, so a
// large body allocates the full payload on the server heap before any truncation
// occurs. Enforcing this limit early keeps memory usage predictable under load.
const MAX_BODY_BYTES = 512 * 1024; // 512 KB

export async function POST(req: Request) {
    try {
        // Reject oversized payloads before parsing JSON to avoid loading
        // a multi-megabyte body into memory only to discard most of it.
        const contentLength = parseInt(req.headers.get('content-length') ?? '0', 10);
        if (contentLength > MAX_BODY_BYTES) {
            return NextResponse.json(
                { error: 'Request payload too large. Maximum size is 512 KB.' },
                { status: 413 }
            );
        }

        const { user, email } = await requireAuth();

        const fullName =
            user.fullName ||
            (user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}`
                : 'Academic Student');

        const { isBlocked, errorResponse } = await checkUserBlock(email);
        if (isBlocked) return errorResponse;

        const rateLimit = await aiLimiter.limit(email);

        if (!rateLimit.success) {
            const retryAfter = Math.max(
                1,
                Math.ceil((rateLimit.reset - Date.now()) / 1000)
            );

            return jsonError(
                'Too many AI requests. Please try again shortly.',
                429,
                'RATE_LIMITED',
                { 'Retry-After': String(retryAfter) }
            );
        }

        const bodyResult = await readJsonWithLimit(req);

        if (!bodyResult.ok) {
            return bodyResult.response;
        }

        const body =
            bodyResult.data &&
            typeof bodyResult.data === 'object' &&
            !Array.isArray(bodyResult.data)
                ? (bodyResult.data as Record<string, unknown>)
                : {};

        const {
            type = 'standard',
            imageBase64,
            classroomId,
            history = [],
        } = body;

        const prompt =
            typeof body.prompt === 'string' ? body.prompt : '';
        const solveType =
            typeof type === 'string' ? type : 'standard';
        let classroomIdValue: number | null = null;

        if (classroomId !== undefined && classroomId !== null) {
            try {
                classroomIdValue = parseClassroomId(classroomId as string);
            } catch {
                return jsonError(
                    'Invalid classroomId.',
                    422,
                    'INVALID_CLASSROOM_ID'
                );
            }
        }

        if (classroomIdValue) {
            await requireMembership(email, classroomIdValue);
        }

        const validatedImage = imageBase64
            ? validateAiImageDataUrl(imageBase64 as string)
            : null;

        if (validatedImage && !validatedImage.ok) {
            return jsonError(
                validatedImage.error,
                validatedImage.status,
                validatedImage.code
            );
        }

        const safeImageBase64 = validatedImage?.dataUrl ?? undefined;

        const result = await generateAISolution(db, {
            email,
            fullName,
            prompt,
            type: solveType,
            imageBase64: safeImageBase64,
            classroomId: classroomIdValue,
            history: history as any[]
        });

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Error in Ask AI Route:', error);
        const { status, body } = buildErrorResponse(error);
        
        if (error.code) {
            body.code = error.code;
        }

        return NextResponse.json(body, { status });
    }
}
