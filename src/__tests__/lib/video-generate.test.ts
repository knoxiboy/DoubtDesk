import { parseAndValidateRequest } from "@/lib/validations/validate";
import { generateVideoSchema } from "@/lib/validations/video";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/video/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("video generate endpoint - request body consumption", () => {
  it("parses request body exactly once via parseAndValidateRequest", async () => {
    const req = makeRequest({ content: "What is photosynthesis?" });
    const jsonSpy = jest.spyOn(req, "json");

    await parseAndValidateRequest(req, generateVideoSchema);

    expect(jsonSpy).toHaveBeenCalledTimes(1);
  });

  it("returns parsed content and imageUrl from data, not a second req.json()", async () => {
    const payload = { content: "Explain Newton's laws" };
    const req = makeRequest(payload);

    const { errorResponse, data } = await parseAndValidateRequest(req, generateVideoSchema);

    expect(errorResponse).toBeNull();
    expect(data).not.toBeNull();
    expect(data?.content).toBe(payload.content);
    expect(data?.imageUrl).toBeUndefined();
  });

  it("returns parsed imageUrl when provided without content", async () => {
    const payload = { imageUrl: "https://example.com/doubt.png" };
    const req = makeRequest(payload);

    const { errorResponse, data } = await parseAndValidateRequest(req, generateVideoSchema);

    expect(errorResponse).toBeNull();
    expect(data?.imageUrl).toBe(payload.imageUrl);
    expect(data?.content).toBeUndefined();
  });

  it("returns errorResponse when both content and imageUrl are missing", async () => {
    const req = makeRequest({});

    const { errorResponse, data } = await parseAndValidateRequest(req, generateVideoSchema);

    expect(errorResponse).not.toBeNull();
    expect(data).toBeNull();
  });

  it("returns errorResponse on invalid JSON body", async () => {
    const req = new Request("http://localhost/api/video/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not valid json",
    });

    const { errorResponse, data } = await parseAndValidateRequest(req, generateVideoSchema);

    expect(errorResponse).not.toBeNull();
    expect(data).toBeNull();
  });

  it("consuming body a second time after parseAndValidateRequest throws or returns empty", async () => {
    const req = makeRequest({ content: "Test question" });

    await parseAndValidateRequest(req, generateVideoSchema);

    // This simulates what the old buggy code did - calling req.json() again
    await expect(req.json()).rejects.toThrow();
  });
});