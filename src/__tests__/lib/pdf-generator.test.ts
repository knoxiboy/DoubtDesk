import { mapDataToTableRows } from "@/lib/pdf-generator";

describe("pdf-generator", () => {
    describe("mapDataToTableRows", () => {
        it("should correctly map analytics data to jspdf-autotable row format", () => {
            const mockData = {
                subjectVolume: [
                    { subject: "Mathematics", count: 45 },
                    { subject: "Physics", count: 32 },
                    { subject: "Chemistry", count: 18 }
                ]
            };

            const result = mapDataToTableRows(mockData);

            expect(result).toEqual([
                ["Mathematics", "45"],
                ["Physics", "32"],
                ["Chemistry", "18"]
            ]);
        });

        it("should return an empty array if subjectVolume is missing or empty", () => {
            const result = mapDataToTableRows({});
            expect(result).toEqual([]);

            const result2 = mapDataToTableRows({ subjectVolume: [] });
            expect(result2).toEqual([]);
        });
    });
});
