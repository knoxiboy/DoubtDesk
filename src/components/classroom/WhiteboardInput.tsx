"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { RotateCcw, Trash2, Sparkles, Check, Loader2, PenTool, Type, Eraser } from "lucide-react";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import { createWorker } from "tesseract.js";

export function convertOcrToLatex(text: string): string {
    if (!text || !text.trim()) return "";
    let clean = text.trim();

    clean = clean
        .replace(/sqrt\(([^)]+)\)/gi, "\\sqrt{$1}")
        .replace(/sqrt\s*([a-zA-Z0-9]+)/gi, "\\sqrt{$1}")
        .replace(/\b(integral|int)\b/gi, "\\int")
        .replace(/\bsum\b/gi, "\\sum")
        .replace(/\balpha\b/gi, "\\alpha")
        .replace(/\bbeta\b/gi, "\\beta")
        .replace(/\bgamma\b/gi, "\\gamma")
        .replace(/\btheta\b/gi, "\\theta")
        .replace(/\b(pi|π)\b/gi, "\\pi")
        .replace(/\b(infinity|inf|∞)\b/gi, "\\infty")
        .replace(/\bfrac\(([^)]+)\,\s*([^)]+)\)/gi, "\\frac{$1}{$2}")
        .replace(/([a-zA-Z0-9]+)\/([a-zA-Z0-9]+)/g, "\\frac{$1}{$2}")
        .replace(/\s*<=\s*/g, " \\le ")
        .replace(/\s*>=\s*/g, " \\ge ")
        .replace(/\s*!=\s*/g, " \\neq ")
        .replace(/\s*==\s*/g, " = ")
        .replace(/([a-zA-Z0-9]+)\^([a-zA-Z0-9]+)/g, "$1^{$2}");

    return clean;
}

interface WhiteboardInputProps {
    onInsertLatex: (latex: string) => void;
    onClose?: () => void;
}

export default function WhiteboardInput({ onInsertLatex, onClose }: WhiteboardInputProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [penColor, setPenColor] = useState<string>("#3b82f6");
    const [penWidth, setPenWidth] = useState<number>(3);
    const [isEraser, setIsEraser] = useState(false);
    const [history, setHistory] = useState<ImageData[]>([]);
    const [isRecognizing, setIsRecognizing] = useState(false);
    const [rawText, setRawText] = useState<string>("");
    const [latex, setLatex] = useState<string>("");
    const [ocrError, setOcrError] = useState<string | null>(null);

    const initCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.fillStyle = "#0f172a"; // Dark background slate-900
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }, []);

    useEffect(() => {
        initCanvas();
    }, [initCanvas]);

    const saveState = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const state = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setHistory((prev) => [...prev, state]);
    };

    const handleUndo = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        if (history.length === 0) {
            initCanvas();
            return;
        }

        const newHistory = [...history];
        const previousState = newHistory.pop();
        setHistory(newHistory);

        if (previousState) {
            ctx.putImageData(previousState, 0, 0);
        } else {
            initCanvas();
        }
    };

    const handleClear = () => {
        initCanvas();
        setHistory([]);
        setRawText("");
        setLatex("");
        setOcrError(null);
    };

    const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();

        let clientX = 0;
        let clientY = 0;

        if ("touches" in e) {
            if (e.touches.length > 0) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            }
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY,
        };
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        saveState();
        setIsDrawing(true);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const { x, y } = getCanvasCoordinates(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const { x, y } = getCanvasCoordinates(e);
        ctx.strokeStyle = isEraser ? "#0f172a" : penColor;
        ctx.lineWidth = isEraser ? penWidth * 4 : penWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = (e?: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (e) e.preventDefault();
        setIsDrawing(false);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.closePath();
        }
    };

    const handleRecognize = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        setIsRecognizing(true);
        setOcrError(null);

        try {
            const dataUrl = canvas.toDataURL("image/png");
            const worker = await createWorker("eng");
            const ret = await worker.recognize(dataUrl);
            await worker.terminate();

            const recognized = ret.data.text || "";
            setRawText(recognized);
            const converted = convertOcrToLatex(recognized);
            setLatex(converted || "\\text{Math equation recognized}");
        } catch (err: any) {
            console.error("OCR recognition error:", err);
            setOcrError(err?.message || "Failed to recognize drawing via OCR.");
        } finally {
            setIsRecognizing(false);
        }
    };

    const handleInsert = () => {
        if (!latex.trim()) return;
        const formatted = latex.startsWith("$$") || latex.startsWith("\\(") ? latex : `$$ ${latex} $$`;
        onInsertLatex(formatted);
        if (onClose) onClose();
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl text-white">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <PenTool className="w-5 h-5 text-blue-400" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-200">
                        Interactive Math Whiteboard
                    </h3>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleUndo}
                        disabled={history.length === 0}
                        aria-label="Undo stroke"
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition-colors"
                        title="Undo stroke"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={handleClear}
                        aria-label="Clear canvas"
                        className="p-2 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 transition-colors"
                        title="Clear whiteboard"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Canvas Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Color:</span>
                    <div className="flex items-center gap-1.5">
                        {["#3b82f6", "#ffffff", "#10b981", "#ef4444", "#f59e0b", "#a855f7"].map((color) => (
                            <button
                                key={color}
                                type="button"
                                onClick={() => {
                                    setPenColor(color);
                                    setIsEraser(false);
                                }}
                                className={`w-6 h-6 rounded-full border-2 transition-all ${
                                    !isEraser && penColor === color ? "border-white scale-110 shadow-lg" : "border-transparent opacity-70 hover:opacity-100"
                                }`}
                                style={{ backgroundColor: color }}
                                title={`Select ${color} pen`}
                            />
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Size:</span>
                    <input
                        type="range"
                        min={1}
                        max={10}
                        value={penWidth}
                        onChange={(e) => setPenWidth(Number(e.target.value))}
                        className="w-24 accent-blue-500 cursor-pointer"
                        title="Pen width"
                    />
                    <span className="text-xs font-bold w-4 text-slate-400">{penWidth}px</span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setIsEraser(!isEraser)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            isEraser ? "bg-amber-500/20 border border-amber-500/40 text-amber-400" : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                        }`}
                    >
                        <Eraser className="w-3.5 h-3.5" />
                        {isEraser ? "Eraser Active" : "Eraser"}
                    </button>
                </div>
            </div>

            {/* Drawing Canvas */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-700/80 shadow-inner bg-slate-900">
                <canvas
                    ref={canvasRef}
                    width={600}
                    height={240}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    onTouchCancel={stopDrawing}
                    className="w-full h-[240px] touch-none cursor-crosshair block"
                    aria-label="Math drawing canvas"
                />
            </div>

            {/* OCR Conversion Trigger */}
            <div className="flex items-center justify-between gap-3">
                <button
                    type="button"
                    onClick={handleRecognize}
                    disabled={isRecognizing}
                    className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20"
                >
                    {isRecognizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {isRecognizing ? "Recognizing Drawing..." : "Convert Drawing to LaTeX"}
                </button>
            </div>

            {ocrError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold">
                    {ocrError}
                </div>
            )}

            {/* OCR / LaTeX Result & Editable Field */}
            {(latex || rawText) && (
                <div className="space-y-3 bg-slate-950/80 border border-slate-800 p-4 rounded-2xl animate-in fade-in duration-200">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                            <Type className="w-3 h-3 text-blue-400" />
                            LaTeX Formula (Editable)
                        </label>
                        <input
                            type="text"
                            value={latex}
                            onChange={(e) => setLatex(e.target.value)}
                            placeholder="e.g. \int_0^\infty x^2 dx"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-blue-300 focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    {/* Live KaTeX Preview */}
                    <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Live Math Preview:
                        </span>
                        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center min-h-[60px] text-white overflow-x-auto">
                            {latex ? (
                                <BlockMath math={latex} />
                            ) : (
                                <span className="text-xs text-slate-500 italic">No math formula generated</span>
                            )}
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        {onClose && (
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleInsert}
                            className="px-5 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-lg shadow-green-600/20"
                        >
                            <Check className="w-4 h-4" />
                            Insert into Question
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
