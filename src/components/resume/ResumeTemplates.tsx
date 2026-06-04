import { ResumeData } from "@/types";
import { jsPDF } from "jspdf";

export const TEMPLATES = [
    { id: "corporate", name: "Corporate Professional", description: "Standard corporate/academic layout with centered headers and section dividers." },
];

export const downloadResume = (data: ResumeData) => {
    const doc = new jsPDF();
    const { personalInfo, education, experience, skills, projects, honors, customSections } = data;

    const renderCorporate = () => {
        let y = 15;
        const margin = 15;
        const width = 180;
        const centerX = 105;

        // 1. Name (Large, Bold, Centered)
        doc.setFontSize(24);
        doc.setFont("times", "bold");
        doc.setTextColor(0, 31, 63); // Deep midnight blue for name
        doc.text(personalInfo.fullName.toUpperCase(), centerX, y, { align: "center" });
        doc.setTextColor(0, 0, 0);
        y += 10;

        // 2. Contact Info (Centered, with custom icons)
        doc.setFont("times", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(80, 80, 80);

        const cleanUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

        // Helper for drawing icons (Solid B&W Style)
        const drawIcon = (type: string, x: number, y: number) => {
            doc.setLineWidth(0.1);
            const iconSize = 2.8;
            const offset = 0.4;
            doc.setDrawColor(80, 80, 80);
            doc.setFillColor(80, 80, 80);

            if (type === "phone") {
                doc.roundedRect(x, y - iconSize + offset, 1.8, iconSize, 0.4, 0.4, "FD");
                doc.setFillColor(255, 255, 255);
                doc.circle(x + 0.9, y - 0.4 + offset, 0.25, "F");
            } else if (type === "email") {
                doc.rect(x, y - 2.5 + offset, 3.8, 2.5, "FD");
                doc.setDrawColor(255, 255, 255);
                doc.setLineWidth(0.15);
                doc.line(x, y - 2.5 + offset, x + 1.9, y - 1.25 + offset);
                doc.line(x + 1.9, y - 1.25 + offset, x + 3.8, y - 2.5 + offset);
            } else if (type === "linkedin") {
                doc.roundedRect(x, y - 2.8 + offset, 3.0, 3.0, 0.4, 0.4, "FD");
                doc.setFillColor(255, 255, 255);
                // "i"
                doc.rect(x + 0.6, y - 1.5 + offset, 0.4, 1.0, "F");
                doc.circle(x + 0.8, y - 1.9 + offset, 0.2, "F");
                // "n"
                doc.rect(x + 1.2, y - 1.5 + offset, 0.4, 1.0, "F");
                doc.roundedRect(x + 1.2, y - 1.55 + offset, 1.2, 0.6, 0.3, 0.3, "F");
                doc.rect(x + 1.9, y - 1.5 + offset, 0.4, 1.0, "F");
            } else if (type === "github") {
                doc.circle(x + 1.6, y - 1.5 + offset, 1.4, "FD");
                doc.triangle(x + 0.5, y - 2.2 + offset, x + 0.8, y - 3.2 + offset, x + 1.2, y - 2.6 + offset, "FD");
                doc.triangle(x + 2.7, y - 2.2 + offset, x + 2.4, y - 3.2 + offset, x + 2.0, y - 2.6 + offset, "FD");
            }
        };

        // Line 1: Phone & Email
        let line1 = "";
        if (personalInfo.phone) line1 += `      ${personalInfo.phone}`;
        if (personalInfo.email) line1 += `${line1 ? "    |    " : ""}      ${personalInfo.email}`;

        // Draw separators in light gray
        if (line1.includes("|")) {
            const separatorX = centerX + (doc.getTextWidth(`      ${personalInfo.phone} `) - (doc.getTextWidth(line1) / 2));
            doc.setDrawColor(210, 210, 210);
            doc.setLineWidth(0.05);
            doc.line(separatorX + 4.5, y - 3, separatorX + 4.5, y + 0.5);
        }

        doc.setTextColor(60, 60, 60);
        doc.text(line1, centerX, y, { align: "center" });

        const l1W = doc.getTextWidth(line1);
        let l1StartX = centerX - (l1W / 2);
        if (personalInfo.phone) {
            drawIcon("phone", l1StartX, y);
            l1StartX += doc.getTextWidth(`      ${personalInfo.phone}`) + (personalInfo.email ? doc.getTextWidth("    |    ") : 0);
        }
        if (personalInfo.email) {
            drawIcon("email", l1StartX, y);
        }
        y += 5;

        // Line 2: Links
        let line2 = "";
        if (personalInfo.linkedin) line2 += `      ${cleanUrl(personalInfo.linkedin)}`;
        if (personalInfo.github) line2 += `${line2 ? "    |    " : ""}      ${cleanUrl(personalInfo.github)}`;

        if (line2) {
            // Draw separators in light gray
            if (line2.includes("|")) {
                const separatorX = centerX + (doc.getTextWidth(`      ${cleanUrl(personalInfo.linkedin || "")} `) - (doc.getTextWidth(line2) / 2));
                doc.setDrawColor(210, 210, 210);
                doc.setLineWidth(0.05);
                doc.line(separatorX + 4.5, y - 3, separatorX + 4.5, y + 0.5);
            }

            doc.setTextColor(0, 102, 204);
            doc.text(line2, centerX, y, { align: "center" });

            let l2W = doc.getTextWidth(line2);
            let l2StartX = centerX - (l2W / 2);

            if (personalInfo.linkedin) {
                const linkW = doc.getTextWidth(`      ${cleanUrl(personalInfo.linkedin || "")}`);
                drawIcon("linkedin", l2StartX, y);
                doc.link(l2StartX + 4, y - 3, linkW - 4, 4, { url: (personalInfo.linkedin || "").startsWith('http') ? (personalInfo.linkedin || "") : `https://${personalInfo.linkedin}` });
                l2StartX += linkW + (personalInfo.github ? doc.getTextWidth("    |    ") : 0);
            }
            if (personalInfo.github) {
                const linkW = doc.getTextWidth(`      ${cleanUrl(personalInfo.github || "")}`);
                drawIcon("github", l2StartX, y);
                doc.link(l2StartX + 4, y - 3, linkW - 4, 4, { url: (personalInfo.github || "").startsWith('http') ? (personalInfo.github || "") : `https://${personalInfo.github}` });
            }
            doc.setTextColor(0, 0, 0);
            y += 4;
        }
        y += 5;

        // Section Helper
        const sectionHeader = (title: string) => {
            if (y > 270) { doc.addPage(); y = 20; }
            y += 4;
            doc.setFontSize(10.5);
            doc.setFont("helvetica", "bold");
            doc.text(title.toUpperCase(), margin, y);
            y += 1.5;
            doc.setLineWidth(0.4);
            doc.setDrawColor(0, 0, 0);
            doc.line(margin, y, margin + width, y);
            y += 6;
        };

        // 3. Summary
        if (personalInfo.summary) {
            sectionHeader("Summary");
            doc.setFontSize(9.5);
            doc.setFont("helvetica", "normal");
            const summaryLines = doc.splitTextToSize(personalInfo.summary, width);
            doc.text(summaryLines, margin, y);
            y += (summaryLines.length * 4.5) + 3;
        }

        // 4. Experience
        if (experience.length > 0) {
            sectionHeader("Professional Experience");
            experience.forEach((exp, idx) => {
                if (y > 250) { doc.addPage(); y = 20; }

                // Role (Left) & Date (Right)
                if (idx > 0) {
                    doc.setDrawColor(240, 240, 240);
                    doc.setLineWidth(0.1);
                    doc.line(margin, y - 2, margin + width, y - 2);
                    y += 2;
                }
                doc.setFontSize(10);
                doc.setFont("helvetica", "bold");
                doc.text(exp.role, margin, y);
                doc.setFont("helvetica", "italic");
                doc.setFontSize(8.5);
                doc.text(`${exp.startDate} - ${exp.endDate}`, margin + width, y, { align: "right" });
                y += 4.5;

                // Company (Left, Italic)
                doc.setFontSize(9.5);
                doc.setFont("helvetica", "italic");
                doc.text(exp.company, margin, y);
                y += 5.5;

                // Description
                const descPoints = exp.description.split('\n').filter(p => p.trim() !== "");
                descPoints.forEach((point) => {
                    const descLines = doc.splitTextToSize(point, width - 6);
                    descLines.forEach((line: string, lIdx: number) => {
                        if (y > 280) { doc.addPage(); y = 20; }
                        doc.setFont("helvetica", "normal");
                        doc.setFontSize(9);
                        doc.text(lIdx === 0 ? "•  " + line : "   " + line, margin + 2, y);
                        y += 4;
                    });
                });
                y += 2;
            });
        }

        // 5. Projects
        if (projects.length > 0) {
            sectionHeader("Strategic Projects");
            projects.forEach((proj, idx) => {
                if (y > 250) { doc.addPage(); y = 20; }

                // Title
                if (idx > 0) {
                    doc.setDrawColor(240, 240, 240);
                    doc.setLineWidth(0.1);
                    doc.line(margin, y - 2, margin + width, y - 2);
                    y += 2;
                }
                doc.setFontSize(10);
                doc.setFont("helvetica", "bold");
                doc.text(proj.title, margin, y);

                // External Link Icon
                if (proj.link) {
                    const titleW = doc.getTextWidth(proj.title);
                    const iconX = margin + titleW + 2;
                    doc.setDrawColor(0, 102, 204);
                    doc.rect(iconX, y - 3, 2.5, 2.5);
                    doc.line(iconX + 1.5, y - 3, iconX + 3, y - 4.5);
                    doc.line(iconX + 2, y - 4.5, iconX + 3, y - 4.5);
                    doc.line(iconX + 3, y - 4.5, iconX + 3, y - 3.5);
                    doc.link(iconX, y - 4.5, 3.5, 4, { url: proj.link.startsWith('http') ? proj.link : `https://${proj.link}` });
                }

                // Tech Tags (Right side)
                if (proj.technologies && proj.technologies.length > 0) {
                    doc.setFontSize(7);
                    doc.setFont("helvetica", "bold");
                    let tagX = margin + width;
                    const techList = [...proj.technologies].reverse();
                    techList.forEach(tag => {
                        const tagW = doc.getTextWidth(tag.toUpperCase()) + 4;
                        tagX -= tagW;
                        doc.setDrawColor(220, 220, 220);
                        doc.setFillColor(245, 245, 245);
                        doc.roundedRect(tagX, y - 3, tagW - 1, 4.5, 1, 1, "FD");
                        doc.setTextColor(100, 100, 100);
                        doc.text(tag.toUpperCase(), tagX + 2, y + 0.5);
                        tagX -= 2; // spacing between tags
                    });
                    doc.setTextColor(0, 0, 0);
                }
                y += 5.5;

                // Description
                const descPoints = proj.description.split('\n').filter(p => p.trim() !== "");
                descPoints.forEach((point) => {
                    const descLines = doc.splitTextToSize(point, width - 6);
                    descLines.forEach((line: string, lIdx: number) => {
                        if (y > 280) { doc.addPage(); y = 20; }
                        doc.setFont("helvetica", "normal");
                        doc.setFontSize(9);
                        doc.text(lIdx === 0 ? "•  " + line : "   " + line, margin + 2, y);
                        y += 4;
                    });
                });
                y += 2;
            });
        }

        // 6. Education
        if (education.length > 0) {
            sectionHeader("Education");
            education.forEach((edu, idx) => {
                if (y > 260) { doc.addPage(); y = 20; }

                // Institution & Date
                if (idx > 0) {
                    doc.setDrawColor(240, 240, 240);
                    doc.setLineWidth(0.1);
                    doc.line(margin, y - 2, margin + width, y - 2);
                    y += 2;
                }
                doc.setFontSize(10);
                doc.setFont("helvetica", "bold");
                doc.text(edu.institution, margin, y);
                doc.setFont("helvetica", "italic");
                doc.setFontSize(8.5);
                doc.text(`${edu.startDate} - ${edu.endDate}`, margin + width, y, { align: "right" });
                y += 4.5;

                // Degree (Italic) & GPA (Bold, Right)
                doc.setFontSize(9.5);
                doc.setFont("helvetica", "italic");
                doc.text(edu.degree, margin, y);
                if (edu.cgpa) {
                    // GPA Pill
                    doc.setFontSize(8);
                    const gpaText = `GPA: ${edu.cgpa}`;
                    const gpaW = doc.getTextWidth(gpaText) + 4;
                    doc.setDrawColor(220, 220, 220);
                    doc.setFillColor(248, 248, 248);
                    doc.roundedRect(margin + width - gpaW, y - 3.5, gpaW, 5, 2, 2, "FD");
                    doc.setFont("helvetica", "bold");
                    doc.text(gpaText, margin + width - gpaW + 2, y);
                }
                y += 6;
            });
        }

        // 7. Skills
        if (skills.length > 0) {
            sectionHeader("Technical Skills");
            const colX = margin + 45; // Fixed column alignment X
            skills.forEach((skill) => {
                if (y > 275) { doc.addPage(); y = 20; }
                doc.setFontSize(9.5);
                doc.setFont("helvetica", "bold");
                doc.text(`${skill.category}:`, margin, y);

                doc.setFont("helvetica", "normal");
                const skillsText = skill.skills.join(", ");
                const skillLines = doc.splitTextToSize(skillsText, width - (colX - margin));
                doc.text(skillLines, colX, y);
                y += (skillLines.length * 4.5) + 1.5;
            });
        }

        // 8. Custom Sections
        if (customSections && customSections.length > 0) {
            customSections.forEach((section) => {
                sectionHeader(section.title);
                section.items.forEach((item, idx) => {
                    if (y > 260) { doc.addPage(); y = 20; }

                    if (idx > 0) {
                        doc.setDrawColor(240, 240, 240);
                        doc.setLineWidth(0.1);
                        doc.line(margin, y - 2, margin + width, y - 2);
                        y += 2;
                    }
                    if (item.title) {
                        doc.setFontSize(10);
                        doc.setFont("helvetica", "bold");
                        doc.text(item.title, margin, y);
                        if (item.date) {
                            doc.setFont("helvetica", "italic");
                            doc.setFontSize(8.5);
                            doc.text(item.date, margin + width, y, { align: "right" });
                        }
                        y += 4.5;
                    }

                    if (item.subtitle || item.location) {
                        if (item.subtitle) {
                            doc.setFontSize(9);
                            doc.setFont("helvetica", "italic");
                            doc.text(item.subtitle, margin, y);
                        }
                        if (item.location) {
                            doc.setFontSize(8.5);
                            doc.setFont("helvetica", "normal");
                            doc.text(item.location, margin + width, y, { align: "right" });
                        }
                        y += 5.5;
                    }

                    const descPoints = (item.description || "").split('\n').filter(p => p.trim() !== "");
                    descPoints.forEach((point) => {
                        const descLines = doc.splitTextToSize(point, width - 6);
                        descLines.forEach((line: string, idx: number) => {
                            if (y > 280) { doc.addPage(); y = 20; }
                            doc.setFont("helvetica", "normal");
                            doc.setFontSize(9);
                            doc.text(idx === 0 ? "•  " + line : "   " + line, margin + 2, y);
                            y += 4;
                        });
                    });
                    y += 2;
                });
            });
        }

        // 9. Honors & Awards
        if (honors && honors.length > 0) {
            sectionHeader("Honors & Awards");
            honors.forEach((honor) => {
                if (!honor) return;
                if (y > 275) { doc.addPage(); y = 20; }

                // Draw refined trophy icon (orange-gold silhouette)
                doc.setDrawColor(255, 140, 0); // Dark Orange
                doc.setFillColor(255, 165, 0); // Orange
                doc.setLineWidth(0.3);

                // Cup (Top ellipse)
                doc.ellipse(margin + 2.5, y - 3, 1.2, 1.5, "FD");
                // Handles (Simulated with tiny triangles/lines)
                doc.line(margin + 1.2, y - 3, margin + 0.8, y - 3.5);
                doc.line(margin + 0.8, y - 3.5, margin + 1.2, y - 4);
                doc.line(margin + 3.8, y - 3, margin + 4.2, y - 3.5);
                doc.line(margin + 4.2, y - 3.5, margin + 3.8, y - 4);
                // Stem & Base
                doc.line(margin + 2.5, y - 1.5, margin + 2.5, y - 0.5);
                doc.line(margin + 1.5, y - 0.5, margin + 3.5, y - 0.5);

                doc.setFontSize(9);
                doc.setFont("helvetica", "normal");
                const honorLines = doc.splitTextToSize(honor, width - 8);
                doc.text(honorLines, margin + 7, y);
                y += (honorLines.length * 4.5) + 1.5;
            });
        }
    };

    renderCorporate();
    doc.save(`${personalInfo.fullName.replace(/\s+/g, '_')}_Resume_v3.0.pdf`);
};
