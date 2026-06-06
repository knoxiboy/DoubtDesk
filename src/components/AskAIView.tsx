"use client"

import { useState, useRef, useEffect } from 'react';
import {
    Send, Zap, BookOpen, Lightbulb, Loader2, RefreshCcw,
    ImagePlus, X, Type, Camera, ListOrdered, Brain, CheckCircle2, AlertCircle, Copy, Check
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import { Doubt } from '@/types';
import {
    AI_IMAGE_ALLOWED_MIME_TYPES,
    AI_IMAGE_ALLOWED_TYPES_LABEL,
    AI_IMAGE_MAX_BYTES,
    AI_IMAGE_MAX_SIZE_LABEL,
    isAllowedAiImageMimeType,
} from '@/lib/ai-image-validation';
import 'katex/dist/katex.min.css';

type SolveType = 'standard' | 'simple' | 'exam' | 'eli10';
function useCopyToClipboard(timeout = 2000) {
    const [copied, setCopied] = useState<string | null>(null);

    const copy = async (text: string, id: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(id);
            toast.success("Copied to clipboard!");
            setTimeout(() => setCopied(null), timeout);
        } catch {
            toast.error("Failed to copy. Please try manually.");
        }
    };

    return { copied, copy };
}
const SECTION_META: Record<string, { icon: React.ReactNode; color: string; badge: string }> = {
    'Step-by-step explanation': {
        icon: <ListOrdered className="w-5 h-5" />,
        color: 'from-blue-500 to-cyan-400',
        badge: 'bg-blue-500/15 border-blue-500/30 text-blue-400',
    },
    'Simplified explanation': {
        icon: <Brain className="w-5 h-5" />,
        color: 'from-purple-500 to-pink-400',
        badge: 'bg-purple-500/15 border-purple-500/30 text-purple-400',
    },
    'Final Answer': {
        icon: <CheckCircle2 className="w-5 h-5" />,
        color: 'from-emerald-500 to-teal-400',
        badge: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
    },
};

function parseSections(text: string): { title: string; content: string }[] {
    const parts = text.split(/^## /m).filter(Boolean);
    return parts.map(part => {
        const newline = part.indexOf('\n');
        const title = newline === -1 ? part.trim() : part.slice(0, newline).trim();
        const content = newline === -1 ? '' : part.slice(newline + 1).trim();
        return { title, content };
    });
}

const EXAMPLE_PROMPTS = [
    "Solve x² - 5x + 6 = 0 using the quadratic formula",
    "Explain Newton's Second Law of Motion",
    "What is Ohm's Law? Give an example.",
];

export default function AskAIView({ classroomId = null, onSuccess, initialDoubt }: { 
    classroomId?: number | null, 
    onSuccess?: () => void,
    initialDoubt?: Doubt | null
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [inputMode, setInputMode] = useState<'text' | 'image'>('text');
    const [prompt, setPrompt] = useState('');
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [response, setResponse] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [currentType, setCurrentType] = useState<SolveType>('standard');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [errorCode, setErrorCode] = useState<string | null>(null);
    const [isVideoLoading, setIsVideoLoading] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
const { copied, copy } = useCopyToClipboard();

    useEffect(() => {
        if (initialDoubt) {
            setPrompt(initialDoubt.content === "Visual Inquiry" ? "" : (initialDoubt.content ?? ""));
            setImageBase64(initialDoubt.imageUrl ?? null);
            setResponse(null);
            setErrorMsg(null);
            setErrorCode(null);
            setVideoUrl(null);

            // Fetch the solution from replies
            const fetchSolution = async () => {
                setIsLoading(true);
                try {
                    const res = await fetch(`/api/replies?doubtId=${initialDoubt.id}`);
                    const data = await res.json();
                    if (res.ok && data.length > 0) {
                        // Find the AI solution reply
                        const solution = data.find((r: { type?: string; userName?: string }) => r.type === 'solution' || r.userName === 'DoubtDesk AI');
                        if (solution) {
                            setResponse(solution.content);
                        } else {
                            setErrorMsg("No solution found for this query.");
                        }
                    } else {
                        setErrorMsg("Could not retrieve the solution.");
                    }
                } catch (err) {
                    setErrorMsg("Connection error while fetching solution.");
                } finally {
                    setIsLoading(false);
                }
            };

            fetchSolution();
            
            // Smooth scroll to the top of the component
            containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [initialDoubt]);

    const handleGenerateVideo = async () => {
        if (!response) return;
        setIsVideoLoading(true);
        setVideoUrl(null);
        try {
            const res = await fetch('/api/video/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    content: response || prompt, 
                    imageUrl: imageBase64 
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Video generation failed.");
            setVideoUrl(data.videoUrl);
        } catch (err: unknown) {
            const error = err instanceof Error ? err : new Error(String(err));
            setErrorMsg(error.message);
        } finally {
            setIsVideoLoading(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.currentTarget;
        const file = input.files?.[0];
        if (!file) return;

        setErrorMsg(null);
        setErrorCode(null);

        if (!isAllowedAiImageMimeType(file.type)) {
            const message = `Please upload a ${AI_IMAGE_ALLOWED_TYPES_LABEL} image.`;
            setErrorMsg(message);
            toast.error(message);
            input.value = '';
            return;
        }

        if (file.size > AI_IMAGE_MAX_BYTES) {
            const message = `Images must be ${AI_IMAGE_MAX_SIZE_LABEL} or smaller.`;
            setErrorMsg(message);
            setErrorCode('IMAGE_TOO_LARGE');
            toast.error(message);
            input.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onerror = () => {
            const message = 'Could not read this image. Please try another file.';
            setErrorMsg(message);
            toast.error(message);
            input.value = '';
        };
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                setImageBase64(reader.result);
                return;
            }

            const message = 'Could not read this image. Please try another file.';
            setErrorMsg(message);
            toast.error(message);
            input.value = '';
        };
        reader.readAsDataURL(file);
    };

    const handleAskAI = async (type: SolveType = 'standard') => {
        if (!prompt.trim() && !imageBase64) return;
        setIsLoading(true);
        setCurrentType(type);
        setErrorMsg(null);
        setErrorCode(null);
        setResponse(null);
        try {
            const res = await fetch('/api/ask-ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, type, imageBase64, classroomId })
            });
            const data = await res.json();
            if (!res.ok) {
                setErrorCode(data?.code || null);
                throw new Error(data?.error || "The AI couldn't process your request.");
            }
            setResponse(data.reply);
            if (onSuccess) onSuccess();
        } catch (err: unknown) {
            const error = err instanceof Error ? err : new Error(String(err));
            setErrorMsg(error.message || "Something went wrong. Please try again.");
            toast.error(error.message || "Failed to process AI request.");
        } finally {
            setIsLoading(false);
        }
    };

    const sections = response ? parseSections(response) : [];

    return (
        <div ref={containerRef} className="space-y-8 text-left scroll-mt-24">
            <div className="bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-white/8 rounded-3xl overflow-hidden shadow-2xl">
                <div className="flex border-b border-slate-200 dark:border-white/5">
                    <button
                        onClick={() => { setInputMode('text'); setImageBase64(null); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-4 text-xs font-black uppercase tracking-widest transition-all ${inputMode === 'text' ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-500/5' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <Type className="w-4 h-4" /> Type Question
                    </button>
                    <button
                        onClick={() => { setInputMode('image'); setPrompt(''); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-4 text-xs font-black uppercase tracking-widest transition-all ${inputMode === 'image' ? 'text-purple-400 border-b-2 border-purple-500 bg-purple-500/5' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <Camera className="w-4 h-4" /> Upload Image
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {inputMode === 'text' ? (
                        <>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Type your doubt here..."
                                rows={4}
                                className="w-full bg-white/60 dark:bg-slate-950/60 border border-slate-200 dark:border-white/8 rounded-2xl px-5 py-4 text-slate-900 dark:text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all resize-none font-medium text-sm leading-relaxed"
                                disabled={isLoading}
                            />
                        </>
                    ) : (
                        <>
                            <input type="file" accept={AI_IMAGE_ALLOWED_MIME_TYPES.join(',')} className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                            {!imageBase64 ? (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full h-44 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl flex flex-col items-center justify-center gap-3 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all group"
                                >
                                    <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center border border-purple-500/20">
                                        <ImagePlus className="w-6 h-6 text-purple-400" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-slate-900 dark:text-white font-bold text-xs uppercase tracking-widest">Select Image</p>
                                        <p className="text-slate-500 dark:text-slate-500 text-[10px] mt-1">{AI_IMAGE_ALLOWED_TYPES_LABEL} · Max {AI_IMAGE_MAX_SIZE_LABEL}</p>
                                    </div>
                                </button>
                            ) : (
                                <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950">
                                    <img src={imageBase64} alt="Uploaded" className="w-full max-h-64 object-contain" />
                                    <button
                                        onClick={() => { setImageBase64(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                        className="absolute top-3 right-3 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shadow-lg"
                                        aria-label="Remove image"
                                    >
                                        <X className="w-4 h-4 text-slate-900 dark:text-white" />
                                    </button>
                                </div>
                            )}
                        </>
                    )}

                    <div className="flex flex-wrap gap-2 justify-end">
                        <button
                            onClick={() => handleAskAI('eli10')}
                            disabled={isLoading || (!prompt.trim() && !imageBase64)}
                            className="flex items-center gap-2 px-5 py-3 bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/20 rounded-2xl font-black uppercase tracking-widest text-[9px] transition-all disabled:opacity-40"
                        >
                            {isLoading && currentType === 'eli10' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />} ELI 10
                        </button>
                        <button
                            onClick={() => handleAskAI('standard')}
                            disabled={isLoading || (!prompt.trim() && !imageBase64)}
                            className="flex items-center gap-2.5 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-xl shadow-blue-600/20 disabled:opacity-40"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            Solve Scoped
                        </button>
                    </div>
                </div>
            </div>

            {isVideoLoading && (
                <div className="p-12 bg-white/40 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-3xl flex flex-col items-center justify-center gap-4 text-center">
                    <div className="relative">
                        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                        <Zap className="w-6 h-6 text-yellow-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                    </div>
                    <div>
                        <p className="text-slate-900 dark:text-white font-black uppercase tracking-widest text-xs">Generating Video AI Masterpiece</p>
                        <p className="text-slate-500 dark:text-slate-500 text-[10px] mt-1 italic">Creating slides, synthesizing voice, and rendering frames...</p>
                    </div>
                </div>
            )}

            {videoUrl && (
                <div className="bg-white dark:bg-slate-950 border-4 border-blue-500/30 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-blue-500/10">
                    <div className="bg-blue-500/10 px-6 py-4 border-b border-blue-500/20 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Zap className="w-5 h-5 text-blue-400" />
                            <span className="text-slate-900 dark:text-white font-black uppercase tracking-tighter italic">AI Video Explanation</span>
                        </div>
                        <span className="bg-blue-500 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase italic">4K UHD AI</span>
                    </div>
                    <video src={videoUrl} controls className="w-full aspect-video" />
                </div>
            )}

            {errorMsg && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-500 text-xs font-bold">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <div>
                        <p>{errorCode === "IMAGE_QUALITY_LOW" ? "Image quality issue" : "Unable to solve this doubt"}</p>
                        <p className="mt-1 text-red-400/75 font-medium">{errorMsg}</p>
                    </div>
                </div>
            )}

            {response && (
    <div className="space-y-4">
        <div className="flex justify-end">
            <button
                onClick={() => copy(response, "full-response")}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-bold uppercase tracking-tighter text-[9px] transition-all text-slate-400 hover:text-white"
                aria-label="Copy full response"
            >
                {copied === "full-response" ? (
                    <><Check className="w-3 h-3 text-green-400" /> All Copied!</>
                ) : (
                    <><Copy className="w-3 h-3" /> Copy All</>
                )}
            </button>
        </div>
        {sections.map((sec, idx) => {
                        const meta = SECTION_META[sec.title];
                        return (
                            <div key={idx} className="bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-white/8 rounded-3xl overflow-hidden shadow-lg">
                                <div className={`flex items-center gap-3 px-6 py-4 border-b border-slate-200 dark:border-white/5`}>
                                    {meta && (
                                        <div className={`flex items-center justify-center w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/5 border ${meta.badge}`}>
                                            {meta.icon}
                                        </div>
                                    )}
                                    <h2 className="text-slate-900 dark:text-white font-black tracking-tight text-sm uppercase italic">{sec.title}</h2>
                                    <div className="ml-auto flex items-center gap-2">
    <button
        onClick={() => copy(sec.content, `section-${idx}`)}
        className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-bold uppercase tracking-tighter text-[9px] transition-all text-slate-400 hover:text-white"
        aria-label="Copy section content"
        title="Copy to clipboard"
    >
        {copied === `section-${idx}` ? (
            <><Check className="w-3 h-3 text-green-400" /> Copied!</>
        ) : (
            <><Copy className="w-3 h-3" /> Copy</>
        )}
    </button>
    {idx === 0 && (
        <button
            onClick={handleGenerateVideo}
            disabled={isVideoLoading}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-slate-900 dark:text-white rounded-xl font-bold uppercase tracking-tighter text-[9px] shadow-lg shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50"
         aria-label="Interactive button">
            {isVideoLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 text-yellow-400 fill-yellow-400" />} {isVideoLoading ? "Generating..." : "Generate Video"}
        </button>
    )}
</div>
                                </div>
                                <div className="px-6 py-6 prose prose-invert max-w-none">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkMath, remarkGfm]}
                                        rehypePlugins={[rehypeKatex]}
                                    >
                                        {sec.content}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
