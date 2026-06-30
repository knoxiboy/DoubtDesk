"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ExportButtonProps {
    classroomId: string;
    
    isTeacher: boolean;
}



export default function AnalyticsExportButton({ classroomId, isTeacher }: ExportButtonProps) {
    const [loading, setLoading] = useState(false);

    if (!isTeacher) return null;

    const handleExport = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/analytics/export?classroomId=${classroomId}`)

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Export failed");
            }

            
            const blob = await res.blob();

const url = window.URL.createObjectURL(blob);

const a = document.createElement("a");

a.href = url;
a.download = "analytics-report.csv";

document.body.appendChild(a);
a.click();
a.remove();

window.URL.revokeObjectURL(url);
            toast.success("CSV exported successfully!");
        } catch (error: unknown) {
            console.error("Export error:", error);
            const message = error instanceof Error ? error.message : "Export failed. Please try again.";
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleExport}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-blue-600/10 hover:text-blue-400 hover:border-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-inner"
         aria-label="Interactive button">
            {loading ? (
                <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Exporting...
                </>
            ) : (
                <>
                    <Download className="w-3.5 h-3.5" />
                    Export CSV
                </>
            )}
        </button>
    );
}
