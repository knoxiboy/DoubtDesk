import axios from "axios";
import { POST } from "@/app/api/resume-analyzer/route";

const mockPdf = jest.fn();

jest.mock("pdf-parse-fork", () => mockPdf);

jest.mock("axios", () => ({
    __esModule: true,
    default: {
        post: jest.fn()
    }
}));

jest.mock("@clerk/nextjs/server", () => ({
    currentUser: jest.fn().mockResolvedValue({
        primaryEmailAddress: { emailAddress: "student@example.com" }
    })
}));

jest.mock("@/lib/auth-utils", () => ({
    checkUserBlock: jest.fn().mockResolvedValue({ isBlocked: false })
}));

const mockDbValues = jest.fn().mockResolvedValue(undefined);

jest.mock("@/configs/db", () => ({
    db: {
        insert: jest.fn().mockReturnValue({
            values: mockDbValues
        })
    }
}));

function createMultipartRequest(file?: Blob, filename = "resume.pdf") {
    const formData = new FormData();

    if (file) {
        formData.append("resume", file, filename);
    }

    return new Request("http://localhost/api/resume-analyzer", {
        method: "POST",
        body: formData
    }) as any;
}

describe("Resume Analyzer API Endpoint", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("rejects requests without a resume file", async () => {
        const res = (await POST(createMultipartRequest()))!;
        const json = await res.json();

        expect(res.status).toBe(400);
        expect(json.error).toBe("Resume file is required");
        expect(mockPdf).not.toHaveBeenCalled();
    });

    it("rejects non-file resume form fields", async () => {
        const formData = new FormData();
        formData.append("resume", "not a file");

        const req = new Request("http://localhost/api/resume-analyzer", {
            method: "POST",
            body: formData
        }) as any;

        const res = (await POST(req))!;
        const json = await res.json();

        expect(res.status).toBe(400);
        expect(json.error).toBe("Resume file is required");
        expect(mockPdf).not.toHaveBeenCalled();
    });

    it("rejects unsupported resume file types before parsing", async () => {
        const req = createMultipartRequest(
            new Blob(["not a pdf"], { type: "text/plain" }),
            "resume.txt"
        );

        const res = (await POST(req))!;
        const json = await res.json();

        expect(res.status).toBe(400);
        expect(json.error).toBe("Only PDF resume files are supported");
        expect(mockPdf).not.toHaveBeenCalled();
    });

    it("rejects PDF MIME uploads without a PDF filename", async () => {
        const req = createMultipartRequest(
            new Blob(["%PDF with bad filename"], { type: "application/pdf" }),
            "resume.docx"
        );

        const res = (await POST(req))!;
        const json = await res.json();

        expect(res.status).toBe(400);
        expect(json.error).toBe("Only PDF resume files are supported");
        expect(mockPdf).not.toHaveBeenCalled();
    });

    it("rejects oversized resumes before reading the upload", async () => {
        const oversizedPdf = new Blob(
            [new Uint8Array(5 * 1024 * 1024 + 1)],
            { type: "application/pdf" }
        );

        const res = (await POST(createMultipartRequest(oversizedPdf)))!;
        const json = await res.json();

        expect(res.status).toBe(400);
        expect(json.error).toBe("Resume file must be 5MB or smaller");
        expect(mockPdf).not.toHaveBeenCalled();
    });

    it("accepts resumes exactly at the 5MB limit", async () => {
        mockPdf.mockResolvedValueOnce({ text: "Experienced TypeScript developer" });
        (axios.post as jest.Mock).mockResolvedValueOnce({
            data: {
                choices: [{
                    message: {
                        content: JSON.stringify({
                            score: 88,
                            summary: "Strong backend resume",
                            scoreBreakdown: {
                                skills: 90,
                                projects: 85,
                                experience: 88,
                                ats: 86,
                                impact: 87,
                                industryFit: 90
                            },
                            strengths: ["TypeScript"],
                            weaknesses: ["Testing"],
                            improvementPoints: ["Add metrics"],
                            missingKeywords: [],
                            sectionwiseAnalysis: {
                                education: "Good",
                                experience: "Strong",
                                projects: "Relevant",
                                skills: "Clear"
                            }
                        })
                    }
                }]
            }
        });

        const maxSizePdf = new Blob(
            [new Uint8Array(5 * 1024 * 1024)],
            { type: "application/pdf" }
        );

        const res = (await POST(createMultipartRequest(maxSizePdf)))!;
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.score).toBe(88);
        expect(mockPdf).toHaveBeenCalledTimes(1);
    });

    it("returns a safe error when PDF parsing fails", async () => {
        mockPdf.mockRejectedValueOnce(new Error("pdf parser stack details"));

        const res = (await POST(createMultipartRequest(
            new Blob(["%PDF invalid"], { type: "application/pdf" })
        )))!;
        const json = await res.json();

        expect(res.status).toBe(400);
        expect(json).toEqual({
            error: "Unable to read the uploaded PDF. Please upload a valid text-based PDF resume."
        });
        expect(json.detail).toBeUndefined();
        expect(json.stack).toBeUndefined();
    });

    it("returns a safe error when no text can be extracted from the PDF", async () => {
        mockPdf.mockResolvedValueOnce({ text: "   " });

        const res = (await POST(createMultipartRequest(
            new Blob(["%PDF image only"], { type: "application/pdf" })
        )))!;
        const json = await res.json();

        expect(res.status).toBe(400);
        expect(json).toEqual({
            error: "Failed to extract text from the PDF"
        });
        expect(json.detail).toBeUndefined();
        expect(json.stack).toBeUndefined();
        expect(axios.post).not.toHaveBeenCalled();
    });

    it("does not expose provider error details to the client", async () => {
        mockPdf.mockResolvedValueOnce({ text: "Experienced TypeScript developer" });
        (axios.post as jest.Mock).mockRejectedValueOnce({
            message: "provider failed",
            response: {
                data: {
                    error: "internal provider response"
                }
            }
        });

        const res = (await POST(createMultipartRequest(
            new Blob(["%PDF valid"], { type: "application/pdf" })
        )))!;
        const json = await res.json();

        expect(res.status).toBe(500);
        expect(json).toEqual({
            error: "Failed to analyze resume. Please try again later."
        });
        expect(JSON.stringify(json)).not.toContain("internal provider response");
        expect(JSON.stringify(json)).not.toContain("provider failed");
    });

    it("analyzes valid PDF resumes successfully", async () => {
        mockPdf.mockResolvedValueOnce({ text: "Experienced TypeScript developer" });
        (axios.post as jest.Mock).mockResolvedValueOnce({
            data: {
                choices: [{
                    message: {
                        content: JSON.stringify({
                            score: 88,
                            summary: "Strong backend resume",
                            scoreBreakdown: {
                                skills: 90,
                                projects: 85,
                                experience: 88,
                                ats: 86,
                                impact: 87,
                                industryFit: 90
                            },
                            strengths: ["TypeScript"],
                            weaknesses: ["Testing"],
                            improvementPoints: ["Add metrics"],
                            missingKeywords: [],
                            sectionwiseAnalysis: {
                                education: "Good",
                                experience: "Strong",
                                projects: "Relevant",
                                skills: "Clear"
                            }
                        })
                    }
                }]
            }
        });

        const res = (await POST(createMultipartRequest(
            new Blob(["%PDF valid"], { type: "application/pdf" })
        )))!;
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.score).toBe(88);
        expect(axios.post).toHaveBeenCalledTimes(1);
        expect(mockDbValues).toHaveBeenCalledWith(expect.objectContaining({
            resumeName: "resume.pdf",
            resumeText: "Experienced TypeScript developer"
        }));
    });
});
