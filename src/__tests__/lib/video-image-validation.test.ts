import {
    detectVideoImageMimeType,
    validateVideoImageUrl,
} from "@/lib/video/image-validation";

describe("video image validation", () => {
    it("detects PNG, JPEG, and WEBP magic bytes", () => {
        expect(
            detectVideoImageMimeType(
                new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
            ),
        ).toBe("image/png");
        expect(detectVideoImageMimeType(new Uint8Array([0xff, 0xd8, 0xff, 0x00]))).toBe(
            "image/jpeg",
        );
        expect(
            detectVideoImageMimeType(
                new Uint8Array([
                    0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
                ]),
            ),
        ).toBe("image/webp");
    });

    it("rejects non-image payloads before OCR", async () => {
        const fetchSpy = jest.spyOn(globalThis, "fetch").mockResolvedValueOnce(
            new Response("not an image", {
                status: 200,
                headers: { "Content-Type": "image/jpeg" },
            }),
        );

        const result = await validateVideoImageUrl("https://example.com/malformed.jpg");

        expect(fetchSpy).toHaveBeenCalledWith("https://example.com/malformed.jpg", {
            cache: "no-store",
        });
        expect(result).toEqual({
            ok: false,
            status: 422,
            code: "INVALID_IMAGE_PAYLOAD",
            error: "Please upload a valid PNG, JPG, or WEBP image.",
        });
    });
});
