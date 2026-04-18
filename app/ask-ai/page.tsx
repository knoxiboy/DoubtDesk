"use client"

import { useState, useRef } from 'react';
import {
    Send, Zap, BookOpen, Lightbulb, Loader2, RefreshCcw,
    ImagePlus, X, Type, Camera, ListOrdered, Brain, CheckCircle2, AlertCircle,
    MessageSquare
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
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
    const fileInputRef = useRef<HTMLInputElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => setImageBase64(reader.result as string);
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

        const newMessages = isFollowUp 
            ? [...messages, { role: 'user' as const, content: currentPrompt }]
            : [{ role: 'user' as const, content: currentPrompt }];

        if (isFollowUp) {
            setMessages(newMessages);
            setFollowUpPrompt('');
            // Small delay to allow state update before scroll
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
            if (!res.ok) throw new Error(data?.error || "The AI couldn't process your request.");
            
            setMessages(prev => [...prev, { role: 'assistant', content: data.reply, type: isFollowUp ? 'standard' : type }]);
            setTimeout(scrollToBottom, 200);
        } catch (err: any) {
            setErrorMsg(err.message || "Something went wrong. Please try again.");
            if (isFollowUp) {
                setMessages(prev => prev.slice(0, -1)); // Remove the user message if it failed
            }
        } finally {
            setIsLoading(false);
        }
    };

    const canSubmit = inputMode === 'text' ? prompt.trim().length > 0 : !!imageBase64;
    const followUpInputRef = useRef<HTMLInputElement>(null);

    const handleStepFollowUp = (stepNum: string, stepLabel: string) => {
        setActiveStepContext({ num: stepNum, label: stepLabel });
        setFollowUpPrompt(`Can you explain this step in more detail?`);
        setTimeout(() => {
            scrollToBottom();
            followUpInputRef.current?.focus();
        }, 100);
    };

    const markdownComponents: any = {
        // Step labels: full-width block row with numbered pill + accent border
        strong: ({ children }: any) => {
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
                        <span className="text-[15px] font-black text-white tracking-tight leading-tight">{label}</span>
                        <button 
                            onClick={() => handleStepFollowUp(num, label)}
                            aria-label={`Ask about step ${num}: ${label}`}
                            className="ml-auto opacity-0 group-hover/step:opacity-100 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-cyan-500/10 border border-white/5 hover:border-cyan-500/30 text-[10px] font-black text-slate-400 hover:text-cyan-400 transition-all uppercase tracking-wider"
                        >
                            <MessageSquare className="w-3 h-3" /> Ask about this
                        </button>
                    </span>
                );
            }
            return <strong className="text-white font-bold">{children}</strong>;
        },

        // Paragraphs: left-aligned, proper spacing
        p: ({ children }: any) => (
            <p className="text-slate-300 leading-[1.9] font-medium my-3 text-[15px] pl-0">{children}</p>
        ),

        // List items
        li: ({ children }: any) => (
            <li className="text-slate-300 leading-relaxed font-medium my-1.5 text-[15px]">{children}</li>
        ),

        // Ordered list — indent cleanly
        ol: ({ children }: any) => (
            <ol className="list-decimal list-outside ml-6 mt-2 mb-4 space-y-2">{children}</ol>
        ),

        // Unordered list
        ul: ({ children }: any) => (
            <ul className="list-disc list-outside ml-6 mt-2 mb-4 space-y-1">{children}</ul>
        ),

        // Inline code
        code: ({ children, className }: any) => {
            const isBlock = className?.startsWith('language-');
            if (isBlock) {
                return (
                    <div className="relative group my-4">
                        <code className={`${className} block bg-slate-900/80 text-cyan-400 p-4 rounded-xl text-[13px] font-mono overflow-x-auto border border-white/5`}>
                            {children}
                        </code>
                    </div>
                );
            }
            return (
                <code className="bg-slate-800/80 text-cyan-300 px-1.5 py-0.5 rounded text-[13px] font-mono border border-white/5">
                    {children}
                </code>
            );
        },

        // Headings
        h1: ({ children }: any) => <h1 className="text-2xl font-black text-white mt-8 mb-4">{children}</h1>,
        h2: ({ children }: any) => <h2 className="text-xl font-bold text-white/90 mt-6 mb-3">{children}</h2>,
        h3: ({ children }: any) => <h3 className="text-lg font-semibold text-white/80 mt-5 mb-2">{children}</h3>,

        // Links
        a: ({ href, children }: any) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline decoration-blue-400/30 hover:decoration-blue-400/60 transition-colors">
                {children}
            </a>
        ),

        // Emphasis
        em: ({ children }: any) => <em className="text-slate-300 italic">{children}</em>,

        // Horizontal rule
        hr: () => <hr className="border-white/10 my-6" />,
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 flex">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <div className="flex-1 flex flex-col h-screen">
                {/* Mobile Header */}
                <header className="lg:hidden flex items-center gap-4 px-4 py-3 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-cyan-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-[0_0_10px_rgba(34,211,238,0.2)]">
                            D
                        </div>
                        <span className="font-bold text-white">Ask AI</span>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto">
                    <div className="max-w-4xl mx-auto px-6 py-8">
                        {/* Header */}
                        <div className="mb-8">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-cyan-500/10 rounded-xl">
                                    <Zap className="w-6 h-6 text-cyan-400" />
                                </div>
                                <h1 className="text-3xl font-black text-white tracking-tight">
                                    Ask AI
                                </h1>
                            </div>
                            <p className="text-slate-400">
                                Get instant help with any academic doubt. Upload an image or type your question.
                            </p>
                        </div>

                        {/* Example Prompts */}
                        <div className="mb-8">
                            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
                                Try these examples
                            </h2>
                            <div className="flex flex-wrap gap-2">
                                {EXAMPLE_PROMPTS.map((p, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setPrompt(p)}
                                        className="px-3 py-1.5 text-sm text-slate-400 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-lg transition-all text-left"
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Message History */}
                        {messages.length > 0 && (
                            <div className="space-y-6 mb-6">
                                {messages.map((msg, i) => {
                                    const isUser = msg.role === 'user';
                                    const isError = isUser && errorMsg;

                                    return (
                                        <div key={i} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                                            {isUser && (
                                                <div className="max-w-[85%] px-4 py-3 rounded-2xl rounded-br-md bg-blue-600 text-white text-[15px] leading-relaxed">
                                                    {msg.content}
                                                    {isError && (
                                                        <div className="mt-2 pt-2 border-t border-blue-500/30 text-blue-200 text-sm">
                                                            <AlertCircle className="w-4 h-4 inline mr-1" />
                                                            {errorMsg}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {!isUser && (
                                                <div className="w-full max-w-[90%]">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="p-1 bg-cyan-500/10 rounded-lg">
                                                            <Zap className="w-4 h-4 text-cyan-400" />
                                                        </div>
                                                        <span className="text-sm font-semibold text-cyan-400">AI Response</span>
                                                        {msg.type && (
                                                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${SECTION_META[Object.keys(SECTION_META)[msg.type === 'simple' ? 1 : msg.type === 'exam' ? 2 : 0]]?.badge}`}>
                                                                {msg.type}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="bg-white/5 border border-white/5 rounded-2xl p-5 text-[15px]">
                                                        <ReactMarkdown
                                                            remarkPlugins={[remarkMath, remarkGfm]}
                                                            rehypePlugins={[rehypeKatex]}
                                                            components={markdownComponents}
                                                        >
                                                            {msg.content}
                                                        </ReactMarkdown>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {isLoading && (
                                    <div className="flex items-center gap-3 text-slate-400">
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Thinking...</span>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>
                        )}

                        {/* Active Step Context */}
                        {activeStepContext && (
                            <div className="mb-4 px-4 py-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-center gap-3">
                                <MessageSquare className="w-4 h-4 text-cyan-400 shrink-0" />
                                <div className="text-sm">
                                    <span className="text-cyan-400 font-semibold">Asking about:</span>
                                    <span className="text-slate-300 ml-2">Step {activeStepContext.num} — {activeStepContext.label}</span>
                                </div>
                                <button
                                    onClick={() => {
                                        setActiveStepContext(null);
                                        setFollowUpPrompt('');
                                    }}
                                    className="ml-auto p-1 text-slate-500 hover:text-white hover:bg-white/5 rounded transition-colors"
                                    aria-label="Cancel context"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        {/* Follow-up Input */}
                        {messages.length > 0 && (
                            <div className="sticky bottom-0 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent pt-4 pb-4">
                                <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-3">
                                    <input
                                        ref={followUpInputRef}
                                        type="text"
                                        value={followUpPrompt}
                                        onChange={(e) => setFollowUpPrompt(e.target.value)}
                                        placeholder="Ask a follow-up question..."
                                        className="flex-1 bg-transparent text-white placeholder-slate-500 outline-none text-[15px]"
                                        onKeyDown={(e) => e.key === 'Enter' && !isLoading && followUpPrompt.trim() && handleAskAI('standard', true)}
                                    />
                                    <button
                                        onClick={() => handleAskAI('standard', true)}
                                        disabled={!followUpPrompt.trim() || isLoading}
                                        className="p-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl transition-colors"
                                        aria-label="Send follow-up question"
                                    >
                                        <Send className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </main>

                {/* Input Area */}
                <div className="border-t border-white/5 bg-slate-950/80 backdrop-blur-xl p-6">
                    <div className="max-w-4xl mx-auto">
                        {/* Mode Toggle */}
                        <div className="flex items-center gap-2 mb-4">
                            <button
                                onClick={() => setInputMode('text')}
                                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${inputMode === 'text' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'}`}
                            >
                                <Type className="w-4 h-4 inline mr-2" />
                                Text
                            </button>
                            <button
                                onClick={() => setInputMode('image')}
                                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${inputMode === 'image' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'}`}
                            >
                                <ImagePlus className="w-4 h-4 inline mr-2" />
                                Image
                            </button>
                        </div>

                        {/* Input Fields */}
                        {inputMode === 'text' ? (
                            <div className="flex items-center gap-3">
                                <input
                                    type="text"
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="Ask any academic question..."
                                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-slate-500 outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all text-[15px]"
                                    onKeyDown={(e) => e.key === 'Enter' && !isLoading && canSubmit && handleAskAI()}
                                />
                                <button
                                    onClick={() => handleAskAI()}
                                    disabled={!canSubmit || isLoading}
                                    className="p-4 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-2xl transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.4)]"
                                    aria-label="Ask AI"
                                >
                                    {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                />
                                {imageBase64 ? (
                                    <div className="relative inline-block">
                                        <img
                                            src={imageBase64}
                                            alt="Uploaded question"
                                            className="max-h-48 rounded-2xl border border-white/10"
                                        />
                                        <button
                                            onClick={() => setImageBase64(null)}
                                            className="absolute -top-2 -right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg"
                                            aria-label="Remove uploaded image"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full py-12 border-2 border-dashed border-white/10 hover:border-white/20 rounded-2xl text-slate-500 hover:text-white transition-colors flex flex-col items-center gap-3"
                                    >
                                        <div className="p-4 bg-white/5 rounded-xl">
                                            <Camera className="w-8 h-8" />
                                        </div>
                                        <span className="text-sm font-medium">Click to upload an image of your question</span>
                                    </button>
                                )}
                                <div className="flex items-center gap-3">
                                    <input
                                        type="text"
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        placeholder="Add context (optional)..."
                                        className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-slate-500 outline-none focus:border-cyan-500/50 transition-all text-[15px]"
                                    />
                                    <button
                                        onClick={() => handleAskAI()}
                                        disabled={!canSubmit || isLoading}
                                        className="p-4 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-2xl transition-all"
                                        aria-label="Ask AI about uploaded image"
                                    >
                                        {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}