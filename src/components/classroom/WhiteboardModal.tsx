import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { X, Send, Download } from "lucide-react";
import { toast } from "sonner";

// Dynamically import Excalidraw to prevent SSR issues
const Excalidraw = dynamic(() => import("@excalidraw/excalidraw").then(mod => mod.Excalidraw), { ssr: false });
const exportToBlob = dynamic(() => import("@excalidraw/excalidraw").then(mod => mod.exportToBlob), { ssr: false });

interface WhiteboardModalProps {
    doubtId: number;
    isOpen: boolean;
    onClose: () => void;
    onExport: (dataUrl: string) => void;
}

export default function WhiteboardModal({ doubtId, isOpen, onClose, onExport }: WhiteboardModalProps) {
    const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
    const [initialData, setInitialData] = useState<{ elements: any[], appState: any } | null>(null);
    
    // Load state from localStorage on mount
    useEffect(() => {
        if (isOpen) {
            const savedState = localStorage.getItem(`excalidraw-state-${doubtId}`);
            if (savedState) {
                try {
                    const parsed = JSON.parse(savedState);
                    setInitialData({
                        elements: parsed.elements,
                        appState: parsed.appState || {}
                    });
                } catch (e) {
                    console.error("Failed to parse saved whiteboard state", e);
                }
            }
        }
    }, [isOpen, doubtId]);

    const handleChange = (elements: any, appState: any) => {
        // Persist to local storage
        try {
            // We only save elements and important appState to avoid bloated storage
            const stateToSave = {
                elements: elements.filter((el: any) => !el.isDeleted),
                appState: {
                    viewBackgroundColor: appState.viewBackgroundColor,
                    currentItemFontFamily: appState.currentItemFontFamily,
                }
            };
            localStorage.setItem(`excalidraw-state-${doubtId}`, JSON.stringify(stateToSave));
        } catch (e) {
            console.error("Failed to save whiteboard state", e);
        }
    };

    const handleExport = async () => {
        if (!excalidrawAPI) return;
        
        try {
            const elements = excalidrawAPI.getSceneElements();
            if (!elements || elements.length === 0 || elements.every(el => el.isDeleted)) {
                toast.error("The whiteboard is empty.");
                return;
            }

            const { exportToBlob } = await import("@excalidraw/excalidraw");
            const blob = await exportToBlob({
                elements,
                appState: excalidrawAPI.getAppState(),
                mimeType: "image/png",
                quality: 1
            });

            // Convert Blob to Data URL
            const reader = new FileReader();
            reader.onloadend = () => {
                onExport(reader.result as string);
            };
            reader.readAsDataURL(blob);
            
        } catch (error) {
            console.error("Failed to export whiteboard:", error);
            toast.error("Failed to export drawing.");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-slate-900/95 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Header / Actions */}
            <div className="flex items-center justify-between px-6 py-4 bg-white/5 border-b border-white/10 shadow-lg">
                <div className="flex items-center gap-3">
                    <h3 className="text-lg font-black text-white uppercase tracking-widest">
                        Interactive Whiteboard
                    </h3>
                    <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        Auto-saving locally
                    </span>
                </div>
                
                <div className="flex items-center gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg transition-colors font-bold text-xs uppercase tracking-wider"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20 transition-all font-black uppercase tracking-widest text-[10px] active:scale-95"
                    >
                        <Download className="w-3.5 h-3.5" /> Attach to Reply
                    </button>
                </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 relative excalidraw-wrapper">
                <Excalidraw
                    excalidrawAPI={(api) => setExcalidrawAPI(api)}
                    initialData={initialData || undefined}
                    onChange={handleChange}
                    theme="dark"
                    UIOptions={{
                        canvasActions: {
                            export: false,
                            saveToActiveFile: false,
                            loadScene: false,
                            clearCanvas: true,
                            toggleTheme: false
                        }
                    }}
                />
            </div>
            <style jsx global>{`
                .excalidraw-wrapper {
                    height: 100%;
                    width: 100%;
                }
                .excalidraw-wrapper .excalidraw {
                    border: none;
                }
            `}</style>
        </div>
    );
}
