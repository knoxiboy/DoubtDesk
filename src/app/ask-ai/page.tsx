"use client"

import { useEffect, useRef, useState } from 'react';
import {
    Send, Zap, BookOpen, Lightbulb, Loader2, RefreshCcw,
    ImagePlus, X, Type, Camera, ListOrdered, Brain, CheckCircle2, AlertCircle,
    MessageSquare, ChevronLeft
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import Sidebar from '@/components/layout/Sidebar';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import {
    AI_IMAGE_ALLOWED_MIME_TYPES,
    AI_IMAGE_ALLOWED_TYPES_LABEL,
    AI_IMAGE_MAX_BYTES,
    AI_IMAGE_MAX_SIZE_LABEL,
    isAllowedAiImageMimeType,
} from '@/lib/ai/ai-image-validation';
import 'katex/dist/katex.min.css';

type InputMode = 'text' | 'image';
type SolveType = 'standard' | 'simple' | 'exam';

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

/** Parse the AI response string into named sections */
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
    "Find the mean and standard deviation of: 5, 10, 15, 20, 25",
    "What is Ohm's Law? Give an example.",
];

export default function AskAIPage() {
    const [inputMode, setInputMode] = useState<InputMode>('text');
    const [prompt, setPrompt] = useState('');
    const [followUpPrompt, setFollowUpPrompt] = useState('');
    const [activeStepContext, setActiveStepContext] = useState<{ num: string, label: string } | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string, type?: SolveType }[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [currentType, setCurrentType] = useState<SolveType>('standard');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [errorCode, setErrorCode] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const { isLoaded, isSignedIn } = useAuth();

    useEffect(() => {
        if (!isLoaded) return;

        if (!isSignedIn) {
            router.push('/sign-in');
        }
    }, [isLoaded, isSignedIn, router]);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.currentTarget;
        const file = input.files?.[0];
        if (!file) return;

        setErrorMsg(null);
        setErrorCode(null);

        if (!isAllowedAiImageMimeType(file.type)) {
            setErrorMsg(`Please upload a ${AI_IMAGE_ALLOWED_TYPES_LABEL} image.`);
            input.value = '';
            return;
        }

        if (file.size > AI_IMAGE_MAX_BYTES) {
            setErrorMsg(`Images must be ${AI_IMAGE_MAX_SIZE_LABEL} or smaller.`);
            setErrorCode('IMAGE_TOO_LARGE');
            input.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onerror = () => {
            setErrorMsg('Could not read this image. Please try another file.');
            input.value = '';
        };
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                setImageBase64(reader.result);
                return;
            }

            setErrorMsg('Could not read this image. Please try another file.');
            input.value = '';
        };
        reader.readAsDataURL(file);
    };

    const handleAskAI = async (type: SolveType = 'standard', isFollowUp: boolean = false) => {
        const currentPrompt = isFollowUp ? followUpPrompt : prompt;
        if (!currentPrompt.trim() && !imageBase64 && !isFollowUp) return;
        
        setIsLoading(true);
        if (!isFollowUp) {
            setCurrentType(type);
            setMessages([]); // Reset for new doubt
        }
        setErrorMsg(null);
        setErrorCode(null);

        const newMessages = isFollowUp 
            ? [...messages, { role: 'user' as const, content: currentPrompt }]
            : [{ role: 'user' as const, content: currentPrompt }];

        if (isFollowUp) {
            setMessages(newMessages);
            setFollowUpPrompt('');
            setTimeout(scrollToBottom, 100);
        }

        try {
            const res = await fetch('/api/ask-ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    prompt: currentPrompt, 
                    type: isFollowUp ? 'standard' : type, 
                    imageBase64: isFollowUp ? null : imageBase64,
                    history: isFollowUp ? messages : []
                })
            });
            const data = await res.json();
            if (!res.ok) {
                setErrorCode(data?.code || null);
                throw new Error(data?.error || "The AI couldn't process your request.");
            }
            
            setMessages(prev => [...prev, { role: 'assistant', content: data.reply, type: isFollowUp ? 'standard' : type }]);
            setTimeout(scrollToBottom, 200);
        } catch (err: unknown) {
            setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
            if (isFollowUp) {
                setMessages(prev => prev.slice(0, -1)); // Remove the user message if it failed
            }
        } finally {
            setIsLoading(false);
        }
    };

    const canSubmit = inputMode === 'text' ? prompt.trim().length > 0 : !!imageBase64;
    const followUpInputRef = useRef<HTMLInputElement>(null);

    if (!isLoaded) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-black text-slate-900 dark:text-white transition-colors duration-500 px-4">
                <div className="max-w-md w-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-black/95 p-8 shadow-2xl shadow-slate-900/10 text-center">
                    <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-cyan-500" />
                    <h2 className="text-2xl font-black mb-2">Checking your session...</h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Just one moment while we securely verify your DoubtDesk account.</p>
                </div>
            </div>
        );
    }

    if (!isSignedIn) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-black text-slate-900 dark:text-white transition-colors duration-500 px-4">
                <div className="max-w-md w-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-black/95 p-8 shadow-2xl shadow-slate-900/10 text-center">
                    <Zap className="mx-auto mb-4 h-12 w-12 text-cyan-500" />
                    <h2 className="text-3xl font-black mb-3">Sign in to use DoubtDesk AI</h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                        This solver is reserved for authenticated students and teachers. Sign in to continue with smart homework help, image solving, and step-by-step explanations.
                    </p>
                    <Link
                        href="/sign-in"
                        className="inline-flex items-center justify-center rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-cyan-500"
                    >
                        Sign in now
                    </Link>
                </div>
            </div>
        );
    }

    const handleStepFollowUp = (stepNum: string, stepLabel: string) => {
        setActiveStepContext({ num: stepNum, label: stepLabel });
        setFollowUpPrompt(`Can you explain this step in more detail?`);
        setTimeout(() => {
            scrollToBottom();
            followUpInputRef.current?.focus();
        }, 100);
    };

    const markdownComponents: Record<string, React.ComponentType<{ children?: React.ReactNode }>> = {
        // Step labels: full-width block row with numbered pill + accent border
        strong: ({ children }: React.HTMLAttributes<HTMLElement>) => {
            const text = String(children);
            const isStepLabel = /^Step\s+\d+/i.test(text);
            if (isStepLabel) {
                const num = text.match(/\d+/)?.[0] || "";
                const label = text.replace(/^Step\s+\d+\s*[–—-]\s*/i, '');
                return (
                    <span className="flex items-center gap-3 mt-7 mb-3 first:mt-0 group/step">
                        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-xs font-black shrink-0 shadow-sm">
                            {num}
                        </span>
                        <span className="text-[15px] font-black text-slate-900 dark:text-white tracking-tight leading-tight">{label}</span>
                        <button 
                            onClick={() => handleStepFollowUp(num, label)}
                            className="ml-auto opacity-0 group-hover/step:opacity-100 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-cyan-500/10 border border-slate-200 dark:border-white/5 hover:border-cyan-500/30 text-[10px] font-black text-slate-600 dark:text-slate-400 hover:text-cyan-400 transition-all uppercase tracking-wider"
                        >
                            <MessageSquare className="w-3 h-3" /> Ask about this
                        </button>
                    </span>
                );
            }
            return <strong className="text-slate-900 dark:text-white font-bold">{children}</strong>;
        },

        // Paragraphs: left-aligned, proper spacing
        p: ({ children }: React.HTMLAttributes<HTMLParagraphElement>) => (
            <p className="text-slate-700 dark:text-slate-300 leading-[1.9] font-medium my-3 text-[15px] pl-0">{children}</p>
        ),

        // List items
        li: ({ children }: React.HTMLAttributes<HTMLLIElement>) => (
            <li className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium my-1.5 text-[15px]">{children}</li>
        ),

        // Ordered list — indent cleanly
        ol: ({ children }: React.HTMLAttributes<HTMLOListElement>) => (
            <ol className="list-decimal list-outside ml-6 mt-2 mb-4 space-y-2">{children}</ol>
        ),

        // Unordered list
        ul: ({ children }: React.HTMLAttributes<HTMLUListElement>) => (
            <ul className="list-disc list-outside ml-6 mt-2 mb-4 space-y-2">{children}</ul>
        ),

        // Block math: left-aligned in a styled container
        div: ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
            if (className?.includes('math-display')) {
                return (
                    <div className="my-4 pl-4 border-l-2 border-cyan-500/40 bg-white/50 dark:bg-black/50 rounded-r-xl py-4 pr-4 overflow-x-auto">
                        <div className={className} {...props}>{children}</div>
                    </div>
                );
            }
            return <div className={className} {...props}>{children}</div>;
        },

        // Tables — beautifully styled
        table: ({ children }: React.HTMLAttributes<HTMLTableElement>) => (
            <div className="my-5 overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/8 shadow-lg">
                <table className="w-full text-sm text-left">{children}</table>
            </div>
        ),
        thead: ({ children }: React.HTMLAttributes<HTMLTableSectionElement>) => (
            <thead className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-white/8">{children}</thead>
        ),
        tbody: ({ children }: React.HTMLAttributes<HTMLTableSectionElement>) => (
            <tbody className="divide-y divide-white/5">{children}</tbody>
        ),
        tr: ({ children }: React.HTMLAttributes<HTMLTableRowElement>) => (
            <tr className="hover:bg-white/3 transition-colors">{children}</tr>
        ),
        th: ({ children }: React.HTMLAttributes<HTMLTableCellElement>) => (
            <th className="px-4 py-3 text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest whitespace-nowrap">{children}</th>
        ),
        td: ({ children }: React.HTMLAttributes<HTMLTableCellElement>) => (
            <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-medium text-[14px] [&_.katex]:text-slate-900 dark:[&_.katex]:text-white">{children}</td>
        ),

        // Blockquote — highlighted note
        blockquote: ({ children }: React.HTMLAttributes<HTMLQuoteElement>) => (
            <blockquote className="my-4 pl-4 border-l-4 border-yellow-500/50 bg-yellow-500/5 rounded-r-xl py-3 pr-4 text-yellow-200/80 italic text-[14px]">
                {children}
            </blockquote>
        ),
    };

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-white dark:from-slate-950 dark:via-slate-900 dark:to-[#020617] text-slate-900 dark:text-white min-w-0 transition-colors duration-500">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <main className="flex-1 flex flex-col min-w-0">
                <header className="flex lg:hidden items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-white/5 bg-white/80 dark:bg-black/80 backdrop-blur-xl sticky top-0 z-20">
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg" aria-label="Open sidebar">
                        <div className="w-5 h-0.5 bg-white mb-1 rounded" /><div className="w-5 h-0.5 bg-white mb-1 rounded" /><div className="w-5 h-0.5 bg-white rounded" />
                    </button>
                    <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                        <Zap className="w-4 h-4 text-slate-900 dark:text-white" />
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white">Ask AI Solver</span>
                </header>

                <div className="flex-1 overflow-y-auto scroll-smooth scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
                    <div className="max-w-[900px] mx-auto w-full px-4 sm:px-8 py-8 pb-6 space-y-6">

                    <div className="flex items-center gap-3 mb-2">
                        <Link href="/" className="flex items-center gap-1.5 text-slate-500 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors text-xs font-black uppercase tracking-widest w-fit shrink-0">
                            <ChevronLeft className="w-4 h-4" /> Home
                        </Link>
                        <span className="text-slate-300 dark:text-slate-700 font-bold">•</span>
                        <Link href="/rooms" className="text-slate-500 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors text-xs font-black uppercase tracking-widest w-fit shrink-0">
                            Classrooms
                        </Link>
                    </div>

                    <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-black/90 shadow-2xl shadow-slate-900/10 dark:shadow-black/30 p-8 sm:p-10">
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-r from-cyan-300/30 via-blue-200/20 to-violet-300/20 blur-3xl opacity-60 dark:from-cyan-500/15 dark:via-blue-500/10 dark:to-violet-500/10" />
                        <div className="relative space-y-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 text-[11px] font-black uppercase tracking-widest">
                                <Zap className="w-3 h-3" /> Powered by Groq AI
                            </div>
                            <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                                AI Instant <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Doubt Solver</span>
                            </h1>
                            <p className="text-slate-600 dark:text-slate-400 text-base max-w-2xl leading-relaxed">
                                Type your doubt or upload a photo of your question. Get fast, clear academic help built for DoubtDesk students and teachers.
                            </p>
                            <div className="grid gap-3 sm:grid-cols-3">
                                {[
                                    { label: 'Step-by-step', desc: 'Follow every logic move', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-200' },
                                    { label: 'Image to answer', desc: 'Upload problem photos', color: 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-200' },
                                    { label: 'Smart follow-ups', desc: 'Ask more about any step', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200' },
                                ].map((item) => (
                                    <div key={item.label} className={`rounded-3xl border border-slate-200 dark:border-slate-800 p-4 ${item.color}`}>
                                        <p className="text-sm font-bold">{item.label}</p>
                                        <p className="text-xs mt-1 text-slate-600 dark:text-slate-300">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/60 dark:bg-black/60 border border-slate-200 dark:border-white/8 rounded-3xl overflow-hidden shadow-2xl">

                        <div className="flex border-b border-slate-200 dark:border-white/5">
                            <button
                                onClick={() => { setInputMode('text'); setImageBase64(null); }}
                                className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold transition-all ${inputMode === 'text' ? 'text-cyan-400 border-b-2 border-cyan-500 bg-cyan-500/5' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                <Type className="w-4 h-4" /> Type Question
                            </button>
                            <button
                                onClick={() => { setInputMode('image'); setPrompt(''); }}
                                className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold transition-all ${inputMode === 'image' ? 'text-purple-400 border-b-2 border-purple-500 bg-purple-500/5' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                <Camera className="w-4 h-4" /> Upload Image
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {inputMode === 'text' ? (
                                <>
                                    <textarea
                                        id="doubt-input"
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAskAI(); }}
                                        placeholder="e.g. How do I solve x² - 5x + 6 = 0?   (Ctrl+Enter to submit)"
                                        rows={4}
                                        className="w-full bg-white/60 dark:bg-black/60 border border-slate-200 dark:border-white/8 rounded-2xl px-5 py-4 text-slate-900 dark:text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40 transition-all resize-none font-medium text-[15px] leading-relaxed"
                                        disabled={isLoading}
                                    />
                                    
                                    <div className="flex flex-wrap gap-2">
                                        {EXAMPLE_PROMPTS.map((ex) => (
                                            <button
                                                key={ex}
                                                onClick={() => setPrompt(ex)}
                                                className="text-xs text-slate-600 dark:text-slate-400 hover:text-cyan-400 px-3 py-1.5 rounded-xl bg-white/4 hover:bg-cyan-500/10 border border-slate-200 dark:border-white/5 hover:border-cyan-500/30 transition-all"
                                            >
                                                {ex.length > 40 ? ex.slice(0, 40) + '…' : ex}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} aria-label="Upload question image" title="Upload question image" />
                                    {!imageBase64 ? (
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-full h-44 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl flex flex-col items-center justify-center gap-3 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all group"
                                        >
                                            <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform border border-purple-500/20">
                                                <ImagePlus className="w-6 h-6 text-purple-400" />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-slate-900 dark:text-white font-bold">Click to upload image</p>
                                                <p className="text-slate-500 dark:text-slate-500 text-sm mt-1">{AI_IMAGE_ALLOWED_TYPES_LABEL} · Max {AI_IMAGE_MAX_SIZE_LABEL}</p>
                                            </div>
                                        </button>
                                    ) : (
                                        <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-white dark:bg-black">
                                            <img src={imageBase64} alt="Uploaded question" className="w-full max-h-64 object-contain" />
                                            <button
                                                onClick={() => { setImageBase64(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                                className="absolute top-3 right-3 w-8 h-8 bg-red-500/90 hover:bg-red-500 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                                                aria-label="Remove image"
                                            >
                                                <X className="w-4 h-4 text-slate-900 dark:text-white" />
                                            </button>
                                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent py-3 px-4">
                                                <p className="text-slate-900 dark:text-white text-sm font-medium">Image ready · AI will read this question</p>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {imageBase64 && (
                                        <textarea
                                            value={prompt}
                                            onChange={(e) => setPrompt(e.target.value)}
                                            placeholder="Optional: Add context or a specific question about this image..."
                                            rows={2}
                                            className="w-full bg-white/60 dark:bg-black/60 border border-slate-200 dark:border-white/8 rounded-2xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all resize-none text-sm"
                                            disabled={isLoading}
                                        />
                                    )}
                                </>
                            )}

                            
                            <div className="flex justify-end pt-1">
                                <button
                                    onClick={() => handleAskAI('standard')}
                                    disabled={isLoading || !canSubmit}
                                    className="flex items-center gap-2.5 px-7 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-slate-900 dark:text-white rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-xl shadow-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed group/btn"
                                >
                                    {isLoading && currentType === 'standard' ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Solving...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                                            <span>Solve Doubt</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    
                    {errorMsg && (
                        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-red-400 font-bold text-sm">
                                    {errorCode === "IMAGE_QUALITY_LOW" ? "Image quality issue" : "Oops! Something went wrong"}
                                </p>
                                <p className="text-red-400/70 text-xs mt-1">
                                    {(() => {       
                                        const error = errorMsg.toLowerCase();

                                        if (errorCode === "IMAGE_QUALITY_LOW") {
                                            return "We couldn't read your image clearly. Please upload a clearer photo or type your doubt instead.";
                                        }

                                        if (error.includes("overloaded")) {
                                            return "Looks like our AI is taking a quick nap 😴 Please try again in a few seconds.";
                                        }

                                        if (error.includes("network")) {
                                            return "Looks like there is a network issue 🌐 Please check your internet connection and try again.";
                                        }

                                        if (error.includes("rate limit")) {
                                            return "Too many requests right now 🚦 Please wait a moment and try again.";
                                        }

                                        if (
                                            error.includes("unexpected token") ||
                                            error.includes("json")
                                        ) {
                                            return "The AI service is having trouble responding right now 🤖 Please try again in a moment.";
                                        }

                                        if (
                                            error.includes("academic") ||
                                            error.includes("flagged")
                                        ) {
                                            return "That does not seem like an academic question 📚 Try asking something related to studies.";
                                        }

                                        return "Something unexpected happened 😓 Please try again.";
                                    })()}
                                </p>
                                <button onClick={() => window.location.reload()}
                                    className="mt-3 px-3 py-1 rounded-lg bg-red-500 text-white text-xs hover:bg-red-600 transition">
                                    Retry
                                </button>
                            </div>
                        </div>
                    )}

                    
                    {messages.length > 0 && (
                        <div className="space-y-6 pb-16">
                            {messages.map((msg, msgIdx) => {
                                if (msg.role === 'user' && msgIdx > 0) {
                                    return (
                                        <div key={msgIdx} className="flex justify-end animate-in slide-in-from-right-4 duration-300">
                                            <div className="max-w-[80%] bg-cyan-600 text-white px-5 py-3 rounded-2xl rounded-tr-none shadow-lg text-sm font-medium">
                                                {msg.content}
                                            </div>
                                        </div>
                                    );
                                }

                                if (msg.role === 'assistant') {
                                    const sections = parseSections(msg.content);
                                    const isInitial = msgIdx === 1; // 0 is user, 1 is first assistant reply

                                    return (
                                        <div key={msgIdx} className={`space-y-4 animate-in fade-in duration-500 ${msgIdx > 1 ? 'slide-in-from-left-4' : 'slide-in-from-bottom-6'}`}>
                                            {sections.length > 0 ? (
                                                sections.map((sec, idx) => {
                                                    const meta = SECTION_META[sec.title];
                                                    return (
                                                        <div
                                                            key={`${msgIdx}-${idx}`}
                                                            className="bg-white/60 dark:bg-black/60 border border-slate-200 dark:border-white/8 rounded-3xl overflow-hidden shadow-lg"
                                                        >
                                                            <div className={`flex items-center gap-3 px-6 py-4 border-b border-slate-200 dark:border-white/5 ${meta ? '' : 'bg-white/3'}`}>
                                                                {meta && (
                                                                    <div className={`flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br ${meta.color} bg-opacity-10 border ${meta.badge} shadow`}>
                                                                        {meta.icon}
                                                                    </div>
                                                                )}
                                                                <h2 className="text-slate-900 dark:text-white font-black tracking-tight text-base">{sec.title || `Section ${idx + 1}`}</h2>
                                                                {meta && (
                                                                    <span className={`ml-auto text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-widest ${meta.badge}`}>
                                                                        {idx === 0 ? 'Step-by-step' : idx === 1 ? 'Simplified' : 'Answer'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="px-6 py-6">
                                                                <ReactMarkdown
                                                                    remarkPlugins={[remarkMath, remarkGfm]}
                                                                    rehypePlugins={[rehypeKatex]}
                                                                    components={markdownComponents}
                                                                >
                                                                    {sec.content}
                                                                </ReactMarkdown>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="bg-white/60 dark:bg-black/60 border border-slate-200 dark:border-white/8 rounded-3xl overflow-hidden shadow-lg p-6">
                                                    <ReactMarkdown
                                                        remarkPlugins={[remarkMath, remarkGfm]}
                                                        rehypePlugins={[rehypeKatex]}
                                                        components={markdownComponents}
                                                    >
                                                        {msg.content}
                                                    </ReactMarkdown>
                                                </div>
                                            )}
                                        </div>
                                    );
                                }
                                return null;
                            })}

                            <div ref={chatEndRef} />

                            
                            {!isLoading && (
                                <div className="bg-white/60 dark:bg-black/60 border border-t-[3px] border-t-cyan-500/30 border-slate-200 dark:border-white/8 rounded-3xl p-4 shadow-2xl sticky bottom-4 z-10 backdrop-blur-xl transition-all">
                                    {activeStepContext && (
                                        <div className="flex items-center gap-2 mb-3 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 w-fit animate-in slide-in-from-left-2 duration-300">
                                            <div className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-[10px] font-black text-cyan-400">
                                                {activeStepContext.num}
                                            </div>
                                            <span className="text-[11px] font-bold text-cyan-400/80 uppercase tracking-wider">Discussing: {activeStepContext.label}</span>
                                            <button 
                                                onClick={() => { setActiveStepContext(null); setFollowUpPrompt(''); }}
                                                className="ml-2 hover:bg-slate-100 dark:hover:bg-white/5 p-1 rounded-md transition-colors"
                                                aria-label="Clear context"
                                            >
                                                <X className="w-3 h-3 text-slate-500 dark:text-slate-500" />
                                            </button>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 relative">
                                            <input
                                                ref={followUpInputRef}
                                                type="text"
                                                value={followUpPrompt}
                                                onChange={(e) => setFollowUpPrompt(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === 'Enter') handleAskAI('standard', true); }}
                                                placeholder={activeStepContext ? "Ask about this step..." : "Ask a follow-up about any step..."}
                                                className="w-full bg-white/60 dark:bg-black/60 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all font-medium"
                                            />
                                        </div>
                                        <button
                                            onClick={() => handleAskAI('standard', true)}
                                            disabled={isLoading || !followUpPrompt.trim()}
                                            className="p-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-40"
                                            aria-label="Send follow-up"
                                        >
                                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-2 ml-1">AI remembers previous steps. Ask things like "Can you explain Step 2 more?"</p>
                                </div>
                            )}

                            
                            {isLoading && (
                                <div className="flex items-start gap-4 animate-pulse">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 shrink-0" />
                                    <div className="space-y-2 flex-1 pt-2">
                                        <div className="h-3 bg-slate-100 dark:bg-white/5 rounded w-full" />
                                        <div className="h-3 bg-slate-100 dark:bg-white/5 rounded w-5/6" />
                                        <div className="h-3 bg-slate-100 dark:bg-white/5 rounded w-4/6" />
                                    </div>
                                </div>
                            )}

                            
                            {!isLoading && messages.length === 2 && currentType === 'standard' && (
                                <div className="bg-white/40 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-2xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                    <div>
                                        <p className="text-slate-900 dark:text-white font-bold text-sm">Need a different take?</p>
                                        <p className="text-slate-500 dark:text-slate-500 text-xs mt-0.5">Get the same answer in another style</p>
                                    </div>
                                    <div className="flex gap-3 sm:ml-auto flex-wrap">
                                        <button
                                            onClick={() => handleAskAI('standard')}
                                            disabled={isLoading}
                                            className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 rounded-xl border border-yellow-500/20 hover:border-yellow-500/40 transition-all text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                                        >
                                            {isLoading && currentType === 'standard' ? (
                                                <>
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    <span>Simplifying...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Lightbulb className="w-3.5 h-3.5" />
                                                    <span>Explain Simply</span>
                                                </>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => handleAskAI('standard')}
                                            disabled={isLoading}
                                            className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition-all text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                                        >
                                            {isLoading && currentType === 'standard' ? (
                                                <>
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    <span>Preparing...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <BookOpen className="w-3.5 h-3.5" />
                                                    <span>Exam-Ready</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    
                    {messages.length === 0 && !isLoading && !errorMsg && (
                        <div className="text-center py-10 space-y-3">
                            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-3xl flex items-center justify-center border border-cyan-500/20 shadow-2xl shadow-cyan-500/10">
                                <Zap className="w-9 h-9 text-cyan-400" />
                            </div>
                            <div>
                                <p className="text-slate-900 dark:text-white font-bold text-lg">Ready to solve your doubt</p>
                                <p className="text-slate-500 dark:text-slate-500 text-sm mt-1">Type your question above or upload a photo to get started</p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 max-w-xl mx-auto">
                                {[
                                    { icon: <ListOrdered className="w-5 h-5" />, label: 'Step-by-step', desc: 'Clear, logical breakdown' },
                                    { icon: <Brain className="w-5 h-5" />, label: 'Simplified', desc: 'Easy to understand' },
                                    { icon: <CheckCircle2 className="w-5 h-5" />, label: 'Final Answer', desc: 'Direct answer highlighted' },
                                ].map((f) => (
                                    <div key={f.label} className="bg-white/40 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-2xl p-4 text-center">
                                        <div className="w-10 h-10 mx-auto bg-slate-100 dark:bg-white/5 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-400 mb-3">{f.icon}</div>
                                        <p className="text-slate-900 dark:text-white font-bold text-sm">{f.label}</p>
                                        <p className="text-slate-500 dark:text-slate-500 text-xs mt-1">{f.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    </div>
                </div>
            </main>
        </div>
    );
}
