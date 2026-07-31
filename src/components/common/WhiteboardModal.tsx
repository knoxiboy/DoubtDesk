"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    X,
    Pencil,
    Eraser,
    Square,
    Circle as CircleIcon,
    Minus,
    MoveRight,
    Type,
    RotateCcw,
    RotateCw,
    Trash2,
    Check,
    Grid,
    Download,
} from "lucide-react";
import { toast } from "sonner";

interface WhiteboardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (dataUrl: string) => void;
    initialImage?: string;
}

type Tool = "pen" | "eraser" | "line" | "arrow" | "rectangle" | "circle" | "text";
type GridStyle = "none" | "dots" | "grid";

const COLOR_PALETTE = [
    "#000000", // Black
    "#ffffff", // White
    "#3b82f6", // Blue
    "#ef4444", // Red
    "#22c55e", // Green
    "#eab308", // Yellow
    "#a855f7", // Purple
    "#f97316", // Orange
];

const STROKE_WIDTHS = [
    { label: "Thin", value: 2 },
    { label: "Medium", value: 4 },
    { label: "Thick", value: 8 },
];

export default function WhiteboardModal({
    isOpen,
    onClose,
    onSave,
    initialImage,
}: WhiteboardModalProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    const [activeTool, setActiveTool] = useState<Tool>("pen");
    const [color, setColor] = useState<string>("#3b82f6");
    const [strokeWidth, setStrokeWidth] = useState<number>(4);
    const [gridStyle, setGridStyle] = useState<GridStyle>("dots");

    const [isDrawing, setIsDrawing] = useState<boolean>(false);
    const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);

    // History for undo / redo
    const [history, setHistory] = useState<ImageData[]>([]);
    const [historyStep, setHistoryStep] = useState<number>(-1);

    // Text tool state
    const [textInput, setTextInput] = useState<{ x: number; y: number; text: string } | null>(null);

    // Canvas size initialization and responsiveness
    const initCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        // Store existing image content if re-sizing
        const ctx = canvas.getContext("2d");
        let tempImageData: ImageData | null = null;
        if (ctx && canvas.width > 0 && canvas.height > 0) {
            try {
                tempImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            } catch (_) {}
        }

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;

        if (ctx) {
            ctx.scale(dpr, dpr);
            ctx.lineCap = "round";
            ctx.lineJoin = "round";

            // Fill canvas with white background
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, rect.width, rect.height);

            if (tempImageData) {
                ctx.putImageData(tempImageData, 0, 0);
            } else if (initialImage) {
                const img = new Image();
                img.onload = () => {
                    ctx.drawImage(img, 0, 0, rect.width, rect.height);
                    saveState();
                };
                img.src = initialImage;
            } else {
                saveState();
            }
        }
    }, [initialImage]);

    useEffect(() => {
        if (isOpen) {
            setTimeout(initCanvas, 50);
            window.addEventListener("resize", initCanvas);
        }
        return () => {
            window.removeEventListener("resize", initCanvas);
        };
    }, [isOpen, initCanvas]);

    // Save current canvas snapshot to history
    const saveState = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setHistory((prev) => {
            const nextHistory = prev.slice(0, historyStep + 1);
            return [...nextHistory, imageData];
        });
        setHistoryStep((prev) => prev + 1);
    }, [historyStep]);

    // Undo action
    const handleUndo = () => {
        if (historyStep <= 0) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const targetStep = historyStep - 1;
        const imageData = history[targetStep];
        if (imageData) {
            ctx.putImageData(imageData, 0, 0);
            setHistoryStep(targetStep);
        }
    };

    // Redo action
    const handleRedo = () => {
        if (historyStep >= history.length - 1) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const targetStep = historyStep + 1;
        const imageData = history[targetStep];
        if (imageData) {
            ctx.putImageData(imageData, 0, 0);
            setHistoryStep(targetStep);
        }
    };

    // Clear canvas
    const handleClear = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const container = containerRef.current;
        const rect = container?.getBoundingClientRect() || { width: canvas.width, height: canvas.height };

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, rect.width, rect.height);
        saveState();
        toast.info("Canvas cleared");
    };

    // Get pointer coordinates relative to canvas
    const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    };

    // Pointer event handlers
    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const pos = getCoordinates(e);

        if (activeTool === "text") {
            setTextInput({ x: pos.x, y: pos.y, text: "" });
            return;
        }

        setIsDrawing(true);
        setStartPos(pos);

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.strokeStyle = activeTool === "eraser" ? "#ffffff" : color;
        ctx.lineWidth = activeTool === "eraser" ? strokeWidth * 4 : strokeWidth;
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !startPos) return;
        e.preventDefault();

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const currentPos = getCoordinates(e);

        if (activeTool === "pen" || activeTool === "eraser") {
            ctx.lineTo(currentPos.x, currentPos.y);
            ctx.stroke();
        } else {
            // Shape preview: restore previous image data before previewing shape
            if (historyStep >= 0 && history[historyStep]) {
                ctx.putImageData(history[historyStep], 0, 0);
            }

            const dpr = window.devicePixelRatio || 1;
            ctx.save();
            ctx.scale(dpr, dpr);
            ctx.strokeStyle = color;
            ctx.lineWidth = strokeWidth;
            ctx.lineCap = "round";

            if (activeTool === "line") {
                ctx.beginPath();
                ctx.moveTo(startPos.x, startPos.y);
                ctx.lineTo(currentPos.x, currentPos.y);
                ctx.stroke();
            } else if (activeTool === "arrow") {
                drawArrow(ctx, startPos.x, startPos.y, currentPos.x, currentPos.y, strokeWidth);
            } else if (activeTool === "rectangle") {
                ctx.beginPath();
                const width = currentPos.x - startPos.x;
                const height = currentPos.y - startPos.y;
                ctx.strokeRect(startPos.x, startPos.y, width, height);
            } else if (activeTool === "circle") {
                ctx.beginPath();
                const rx = Math.abs(currentPos.x - startPos.x) / 2;
                const ry = Math.abs(currentPos.y - startPos.y) / 2;
                const cx = Math.min(startPos.x, currentPos.x) + rx;
                const cy = Math.min(startPos.y, currentPos.y) + ry;
                ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
                ctx.stroke();
            }
            ctx.restore();
        }
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        e.preventDefault();
        setIsDrawing(false);

        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext("2d");
            if (ctx) ctx.closePath();
        }

        saveState();
        setStartPos(null);
    };

    // Draw Arrow Helper
    const drawArrow = (
        ctx: CanvasRenderingContext2D,
        fromX: number,
        fromY: number,
        toX: number,
        toY: number,
        width: number
    ) => {
        const headlen = Math.max(10, width * 3);
        const dx = toX - fromX;
        const dy = toY - fromY;
        const angle = Math.atan2(dy, dx);

        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
        ctx.lineTo(toX, toY);
        ctx.fillStyle = color;
        ctx.fill();
    };

    // Commit Text Input to Canvas
    const commitText = () => {
        if (!textInput || !textInput.text.trim()) {
            setTextInput(null);
            return;
        }

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.font = `${Math.max(16, strokeWidth * 4)}px sans-serif`;
        ctx.fillStyle = color;
        ctx.fillText(textInput.text, textInput.x, textInput.y + 16);
        ctx.restore();

        saveState();
        setTextInput(null);
    };

    // Save and Export Drawing
    const handleSaveDrawing = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        try {
            const dataUrl = canvas.toDataURL("image/png");
            onSave(dataUrl);
            toast.success("Whiteboard drawing saved!");
            onClose();
        } catch (err) {
            console.error("Failed to export canvas:", err);
            toast.error("Failed to save drawing");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
                {/* Header Toolbar */}
                <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/80">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl">
                            <Pencil className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white leading-none">
                                Visual Whiteboard
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                                Sketch nodes, trees, graphs or formulas
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleUndo}
                            disabled={historyStep <= 0}
                            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-40 transition-all"
                            title="Undo"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={handleRedo}
                            disabled={historyStep >= history.length - 1}
                            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-40 transition-all"
                            title="Redo"
                        >
                            <RotateCw className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={handleClear}
                            className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 transition-all"
                            title="Clear Canvas"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="w-px h-6 bg-slate-200 dark:bg-white/10 mx-1" />
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Sub-Toolbar: Tools, Color & Stroke */}
                <div className="px-4 py-2 bg-slate-100 dark:bg-slate-950/60 border-b border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                    {/* Tool Pickers */}
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-1 rounded-2xl shadow-sm">
                        <button
                            type="button"
                            onClick={() => setActiveTool("pen")}
                            className={`p-2 rounded-xl flex items-center gap-1.5 font-bold transition-all ${
                                activeTool === "pen" ? "bg-blue-600 text-white shadow" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                            }`}
                            title="Pencil / Freehand"
                        >
                            <Pencil className="w-4 h-4" />
                            <span className="hidden sm:inline">Pen</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTool("eraser")}
                            className={`p-2 rounded-xl flex items-center gap-1.5 font-bold transition-all ${
                                activeTool === "eraser" ? "bg-blue-600 text-white shadow" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                            }`}
                            title="Eraser"
                        >
                            <Eraser className="w-4 h-4" />
                            <span className="hidden sm:inline">Eraser</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTool("line")}
                            className={`p-2 rounded-xl flex items-center gap-1.5 font-bold transition-all ${
                                activeTool === "line" ? "bg-blue-600 text-white shadow" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                            }`}
                            title="Line"
                        >
                            <Minus className="w-4 h-4" />
                            <span className="hidden sm:inline">Line</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTool("arrow")}
                            className={`p-2 rounded-xl flex items-center gap-1.5 font-bold transition-all ${
                                activeTool === "arrow" ? "bg-blue-600 text-white shadow" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                            }`}
                            title="Arrow"
                        >
                            <MoveRight className="w-4 h-4" />
                            <span className="hidden sm:inline">Arrow</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTool("rectangle")}
                            className={`p-2 rounded-xl flex items-center gap-1.5 font-bold transition-all ${
                                activeTool === "rectangle" ? "bg-blue-600 text-white shadow" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                            }`}
                            title="Rectangle"
                        >
                            <Square className="w-4 h-4" />
                            <span className="hidden sm:inline">Box</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTool("circle")}
                            className={`p-2 rounded-xl flex items-center gap-1.5 font-bold transition-all ${
                                activeTool === "circle" ? "bg-blue-600 text-white shadow" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                            }`}
                            title="Circle"
                        >
                            <CircleIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Circle</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTool("text")}
                            className={`p-2 rounded-xl flex items-center gap-1.5 font-bold transition-all ${
                                activeTool === "text" ? "bg-blue-600 text-white shadow" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                            }`}
                            title="Text"
                        >
                            <Type className="w-4 h-4" />
                            <span className="hidden sm:inline">Text</span>
                        </button>
                    </div>

                    {/* Color Palette */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                            Color:
                        </span>
                        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-1 rounded-2xl shadow-sm">
                            {COLOR_PALETTE.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColor(c)}
                                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-all border ${
                                        color === c ? "scale-110 border-blue-500 ring-2 ring-blue-500/30" : "border-slate-300 dark:border-white/20 hover:scale-105"
                                    }`}
                                    style={{ backgroundColor: c }}
                                    title={c}
                                >
                                    {color === c && (
                                        <Check className={`w-3.5 h-3.5 ${c === "#ffffff" ? "text-slate-900" : "text-white"}`} />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Stroke Width & Grid options */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                                Stroke:
                            </span>
                            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-1 rounded-2xl shadow-sm">
                                {STROKE_WIDTHS.map((sw) => (
                                    <button
                                        key={sw.value}
                                        type="button"
                                        onClick={() => setStrokeWidth(sw.value)}
                                        className={`px-2 py-1 rounded-xl text-[10px] font-bold transition-all ${
                                            strokeWidth === sw.value ? "bg-blue-600 text-white" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                                        }`}
                                    >
                                        {sw.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                setGridStyle((prev) =>
                                    prev === "dots" ? "grid" : prev === "grid" ? "none" : "dots"
                                )
                            }
                            className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 shadow-sm transition-all"
                            title="Toggle Canvas Grid"
                        >
                            <Grid className="w-3.5 h-3.5 text-blue-500" />
                            <span className="capitalize">{gridStyle}</span>
                        </button>
                    </div>
                </div>

                {/* Canvas Drawing Surface */}
                <div
                    ref={containerRef}
                    className={`relative flex-1 bg-white w-full overflow-hidden touch-none cursor-${
                        activeTool === "eraser" ? "crosshair" : "crosshair"
                    }`}
                    style={{
                        backgroundImage:
                            gridStyle === "dots"
                                ? "radial-gradient(#cbd5e1 1px, transparent 1px)"
                                : gridStyle === "grid"
                                ? "linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)"
                                : "none",
                        backgroundSize: gridStyle === "dots" ? "20px 20px" : gridStyle === "grid" ? "24px 24px" : "auto",
                    }}
                >
                    <canvas
                        ref={canvasRef}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerUp}
                        className="w-full h-full block"
                    />

                    {/* Interactive Text Input Popup */}
                    {textInput && (
                        <div
                            className="absolute z-20 bg-white border border-blue-500 shadow-xl rounded-xl p-2 flex gap-2 items-center animate-in zoom-in-95"
                            style={{ left: textInput.x, top: textInput.y }}
                        >
                            <input
                                type="text"
                                autoFocus
                                value={textInput.text}
                                onChange={(e) => setTextInput({ ...textInput, text: e.target.value })}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") commitText();
                                    if (e.key === "Escape") setTextInput(null);
                                }}
                                placeholder="Type text & press Enter"
                                className="text-xs text-slate-900 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-500 w-44"
                            />
                            <button
                                type="button"
                                onClick={commitText}
                                className="p-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <Check className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer Save Button */}
                <div className="px-6 py-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
                        Draw your diagram or solution and click Attach Drawing to embed.
                    </p>
                    <div className="flex items-center gap-3 ml-auto">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-2xl bg-slate-200 dark:bg-white/5 hover:bg-slate-300 dark:hover:bg-white/10 text-slate-800 dark:text-white font-bold text-xs transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveDrawing}
                            className="px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            Attach Drawing
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
