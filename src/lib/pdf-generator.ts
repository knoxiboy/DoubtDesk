import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toPng } from "html-to-image";

export async function generateAnalyticsReport(data: any, chartElementId: string) {
    if (!data || !data.subjectVolume) {
        throw new Error("Invalid analytics data provided for PDF export.");
    }

    const doc = new jsPDF("p", "pt", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 40;

    // 1. Header
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59); // slate-900
    doc.text("Classroom Analytics Report", 40, currentY);
    currentY += 20;
    
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 40, currentY);
    currentY += 40;

    // 2. Charts Image
    const chartElement = document.getElementById(chartElementId);
    if (chartElement) {
        try {
            // Wait slightly for any animations to finish if needed
            await new Promise(r => setTimeout(r, 100));
            
            const dataUrl = await toPng(chartElement, {
                quality: 1,
                backgroundColor: "#ffffff",
                style: {
                    transform: "scale(1)",
                    transformOrigin: "top left"
                }
            });
            
            // Calculate aspect ratio to fit width
            const imgProps = doc.getImageProperties(dataUrl);
            const margin = 40;
            const pdfWidth = pageWidth - (margin * 2);
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            doc.addImage(dataUrl, "PNG", margin, currentY, pdfWidth, pdfHeight);
            currentY += pdfHeight + 40;
        } catch (error) {
            console.error("Failed to capture charts for PDF:", error);
            // Continue PDF generation even if charts fail
        }
    }

    // 3. Data Tables (Subject Volume)
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text("Doubt Volume by Subject", 40, currentY);
    currentY += 15;

    const tableRows = data.subjectVolume.map((item: any) => [
        item.subject,
        item.count.toString()
    ]);

    autoTable(doc, {
        startY: currentY,
        head: [["Subject", "Doubt Count"]],
        body: tableRows,
        theme: "striped",
        headStyles: { fillColor: [139, 92, 246] }, // purple-500
        margin: { left: 40, right: 40 }
    });

    // 4. Save PDF
    const filename = `ClassroomData_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
}

// Export mapping function strictly for unit testing purposes without DOM/jsPDF mocking nightmare
export function mapDataToTableRows(data: any): string[][] {
    if (!data?.subjectVolume) return [];
    return data.subjectVolume.map((item: any) => [
        item.subject,
        item.count.toString()
    ]);
}
