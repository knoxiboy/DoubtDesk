export const AI_REQUEST_MAX_BYTES = 4 * 1024 * 1024;
export const AI_IMAGE_MAX_BYTES = 3 * 1024 * 1024;

function formatMegabytes(bytes: number) {
    return `${bytes / (1024 * 1024)}MB`;
}

export const AI_REQUEST_MAX_SIZE_LABEL = formatMegabytes(AI_REQUEST_MAX_BYTES);
export const AI_IMAGE_MAX_SIZE_LABEL = formatMegabytes(AI_IMAGE_MAX_BYTES);
export const AI_IMAGE_ALLOWED_TYPES_LABEL = 'PNG, JPG, WEBP';
export const AI_IMAGE_ALLOWED_MIME_TYPES = [
    'image/png',
    'image/jpeg',
    'image/webp',
] as const;

const AI_IMAGE_DATA_URL_PATTERN =
    /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/i;

export type AiImageValidationResult =
    | {
          ok: true;
          dataUrl: string;
          mimeType: string;
          decodedBytes: number;
      }
    | {
          ok: false;
          status: 413 | 422;
          code: string;
          error: string;
      };

export function isAllowedAiImageMimeType(mimeType: string) {
    return (AI_IMAGE_ALLOWED_MIME_TYPES as readonly string[]).includes(
        mimeType.toLowerCase()
    );
}

export function getBase64DecodedByteLength(base64Data: string) {
    const padding =
        base64Data.endsWith("==") ? 2 : base64Data.endsWith("=") ? 1 : 0;

    return Math.floor((base64Data.length * 3) / 4) - padding;
}

export function validateAiImageDataUrl(
    imageBase64: unknown
): AiImageValidationResult {
    if (typeof imageBase64 !== "string") {
        return {
            ok: false,
            status: 422,
            code: 'INVALID_IMAGE_PAYLOAD',
            error: 'Please upload a valid PNG, JPG, or WEBP image.',
        };
    }

    const match = imageBase64.match(AI_IMAGE_DATA_URL_PATTERN);

    if (!match) {
        return {
            ok: false,
            status: 422,
            code: 'INVALID_IMAGE_PAYLOAD',
            error: 'Please upload a valid PNG, JPG, or WEBP image.',
        };
    }

    const mimeType = match[1].toLowerCase();
    const base64Data = match[2];

    if (base64Data.length % 4 !== 0) {
        return {
            ok: false,
            status: 422,
            code: 'INVALID_IMAGE_PAYLOAD',
            error: 'Please upload a valid PNG, JPG, or WEBP image.',
        };
    }

    if (!isAllowedAiImageMimeType(mimeType)) {
        return {
            ok: false,
            status: 422,
            code: 'UNSUPPORTED_IMAGE_TYPE',
            error: `Only ${AI_IMAGE_ALLOWED_TYPES_LABEL} images are supported.`,
        };
    }

    const decodedBytes = getBase64DecodedByteLength(base64Data);

    if (decodedBytes <= 0) {
        return {
            ok: false,
            status: 422,
            code: 'INVALID_IMAGE_PAYLOAD',
            error: 'Please upload a valid PNG, JPG, or WEBP image.',
        };
    }

    if (decodedBytes > AI_IMAGE_MAX_BYTES) {
        return {
            ok: false,
            status: 413,
            code: 'IMAGE_TOO_LARGE',
            error: `Images must be ${AI_IMAGE_MAX_SIZE_LABEL} or smaller.`,
        };
    }

    return {
        ok: true,
        dataUrl: imageBase64,
        mimeType,
        decodedBytes,
    };
}
