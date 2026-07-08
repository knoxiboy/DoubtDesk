import { jsPDF } from "jspdf";

/**
 * Doubt type matching the doubtsTable schema from configs/schema.ts
 * with the additional replyCount field appended by the API.
 */
export interface ExportDoubt {
    id: number;
    userName: string;
    userEmail: string | null;
    classroomId: number | null;
    subject: string;
    subTopic: string | null;
    content: string | null;
    imageUrl: string | null;
    likes: number | null;
    isSolved: string | null;
    solvedReplyId: number | null;
    type: string | null;
    createdAt: string;
    replyCount?: number;
}

/**
 * Generates and downloads a PDF report of classroom doubts.
 *
 * @param classroomName - Name of the classroom
 * @param doubts - Array of doubts to include in the PDF
 */
export function exportDoubtsPDF(classroomName: string, doubts: ExportDoubt[]): void {
    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginLeft = 20;
    const marginRight = 20;
    const contentWidth = pageWidth - marginLeft - marginRight;
    const bottomMargin = 25;
    let y = 20;

    const checkPageOverflow = (requiredSpace: number): void => {
        if (y + requiredSpace > pageHeight - bottomMargin) {
            doc.addPage();
            y = 20;
        }
    };

    // ── Header ──────────────────────────────────────────────
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 64, 175); // Blue-700
    doc.text("DoubtDesk", marginLeft, y);

    const titleWidth = doc.getTextWidth("DoubtDesk");
    doc.setTextColor(15, 23, 42); // Slate-900
    doc.setFontSize(22);
    doc.text(` — ${classroomName}`, marginLeft + titleWidth, y);
    y += 10;

    // Subheader: export date
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139); // Slate-500
    const exportDate = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });
    doc.text(`Exported on: ${exportDate}`, marginLeft, y);
    y += 3;

    // Summary line
    const solvedCount = doubts.filter((d) => d.isSolved === "solved").length;
    const unsolvedCount = doubts.length - solvedCount;
    doc.setFontSize(9);
    doc.text(
        `Total: ${doubts.length} doubts  •  Solved: ${solvedCount}  •  Unsolved: ${unsolvedCount}`,
        marginLeft,
        y
    );
    y += 5;

    // Horizontal line
    doc.setDrawColor(203, 213, 225); // Slate-300
    doc.setLineWidth(0.5);
    doc.line(marginLeft, y, pageWidth - marginRight, y);
    y += 10;

    // ── Doubts ──────────────────────────────────────────────
    if (doubts.length === 0) {
        doc.setFontSize(12);
        doc.setTextColor(148, 163, 184);
        doc.text("No doubts found matching the selected filters.", marginLeft, y);
    }

    doubts.forEach((doubt, index) => {
        // Estimate space needed for this doubt block (minimum ~35mm)
        checkPageOverflow(45);

        // Doubt number
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 64, 175);
        doc.text(`#${index + 1}`, marginLeft, y);
        y += 7;

        // Subject & Sub-topic
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        const subjectLine = doubt.subTopic
            ? `${doubt.subject} → ${doubt.subTopic}`
            : doubt.subject;
        doc.text(subjectLine, marginLeft, y);
        y += 6;

        // Question content (with text wrapping)
        if (doubt.content) {
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(51, 65, 85); // Slate-700
            const wrappedText = doc.splitTextToSize(doubt.content, contentWidth);
            for (const line of wrappedText) {
                checkPageOverflow(6);
                doc.text(line, marginLeft, y);
                y += 5;
            }
            y += 2;
        }

        // Metadata row
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);

        checkPageOverflow(6);
        doc.text(`Posted by: ${doubt.userName}`, marginLeft, y);
        y += 5;

        checkPageOverflow(6);
        const statusSymbol = doubt.isSolved === "solved" ? "✓" : "✗";
        const statusLabel = doubt.isSolved === "solved" ? "Resolved" : "Unresolved";
        doc.text(`Status: ${statusLabel} ${statusSymbol}`, marginLeft, y);

        // Replies count on same line, right-aligned
        const repliesText = `Replies: ${doubt.replyCount ?? 0}`;
        const repliesWidth = doc.getTextWidth(repliesText);
        doc.text(repliesText, pageWidth - marginRight - repliesWidth, y);
        y += 5;

        checkPageOverflow(6);
        const createdDate = new Date(doubt.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
        doc.text(`Created at: ${createdDate}`, marginLeft, y);

        // Type badge on same line, right-aligned
        const typeText = `Type: ${doubt.type ?? "community"}`;
        const typeWidth = doc.getTextWidth(typeText);
        doc.text(typeText, pageWidth - marginRight - typeWidth, y);
        y += 7;

        // Separator line between doubts
        if (index < doubts.length - 1) {
            checkPageOverflow(8);
            doc.setDrawColor(226, 232, 240); // Slate-200
            doc.setLineWidth(0.3);
            doc.line(marginLeft, y, pageWidth - marginRight, y);
            y += 8;
        }
    });

    // ── Footer on last page ─────────────────────────────────
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(148, 163, 184);
    doc.text(
        "Generated by DoubtDesk — AI-Powered Classroom Doubt Solving Platform",
        marginLeft,
        pageHeight - 10
    );

    // Trigger download
    const sanitizedName = classroomName.replace(/[^a-zA-Z0-9]/g, "_");
    const dateStamp = new Date().toISOString().split("T")[0];
    doc.save(`DoubtDesk_${sanitizedName}_${dateStamp}.pdf`);
}
