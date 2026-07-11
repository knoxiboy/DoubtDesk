const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const WEBP_SIGNATURE_PREFIX = [0x52, 0x49, 0x46, 0x46];
const WEBP_SIGNATURE_SUFFIX = [0x57, 0x45, 0x42, 0x50];

export const VIDEO_IMAGE_ALLOWED_MIME_TYPES = [
    'image/png',
    'image/jpeg',
    'image/webp',
] as const;

export const VIDEO_IMAGE_ALLOWED_TYPES_LABEL = 'PNG, JPG, or WEBP';

export type VideoImageValidationResult =
    | { ok: true; mimeType: string }
    | {
          ok: false;
          status: 422 | 500;
          code: string;
          error: string;
      };

export function isAllowedVideoImageMimeType(mimeType: string) {
    return (VIDEO_IMAGE_ALLOWED_MIME_TYPES as readonly string[]).includes(
        mimeType.toLowerCase(),
    );
}

export function detectVideoImageMimeType(bytes: Uint8Array): string | null {
    if (bytes.length >= PNG_SIGNATURE.length && PNG_SIGNATURE.every((byte, index) => bytes[index] === byte)) {
        return 'image/png';
    }

    if (bytes.length >= JPEG_SIGNATURE.length && JPEG_SIGNATURE.every((byte, index) => bytes[index] === byte)) {
        return 'image/jpeg';
    }

    if (
        bytes.length >= 12 &&
        WEBP_SIGNATURE_PREFIX.every((byte, index) => bytes[index] === byte) &&
        WEBP_SIGNATURE_SUFFIX.every((byte, index) => bytes[index + 8] === byte)
    ) {
        return 'image/webp';
    }

    return null;
}

export async function validateVideoImageUrl(imageUrl: string): Promise<VideoImageValidationResult> {
    try {
        const response = await fetch(imageUrl, { cache: 'no-store' });
        if (!response.ok) {
            return {
                ok: false,
                status: 422,
                code: 'INVALID_IMAGE_PAYLOAD',
                error: `Please upload a valid ${VIDEO_IMAGE_ALLOWED_TYPES_LABEL} image.`,
            };
        }

        const bytes = new Uint8Array(await response.arrayBuffer());
        const mimeType = detectVideoImageMimeType(bytes);

        if (!mimeType || !isAllowedVideoImageMimeType(mimeType)) {
            return {
                ok: false,
                status: 422,
                code: 'INVALID_IMAGE_PAYLOAD',
                error: `Please upload a valid ${VIDEO_IMAGE_ALLOWED_TYPES_LABEL} image.`,
            };
        }

        return { ok: true, mimeType };
    } catch {
        return {
            ok: false,
            status: 422,
            code: 'INVALID_IMAGE_PAYLOAD',
            error: `Please upload a valid ${VIDEO_IMAGE_ALLOWED_TYPES_LABEL} image.`,
        };
    }
}
