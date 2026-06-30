"use client";

import { useState, useEffect, useRef } from "react";
import { X, Loader2, Upload, File, Eye, EyeOff, Bold, Italic, Code, List, Tags, Sparkles, FileText, ExternalLink, AlertCircle, CheckCircle2, Search } from "lucide-react";
import { toast } from "sonner";
import useSWR from "swr";
import MarkdownRenderer from "./MarkdownRenderer";
import type { Doubt, Tag } from "@/types";
import { OFFLINE_DOUBT_QUEUED } from "@/lib/copy-constants";

const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) {
        const error = new Error("An error occurred while fetching the data.");
        try {
            (error as any).info = await res.json();
        } catch (_) {
            (error as any).info = { error: res.statusText };
        }
        (error as any).status = res.status;
        throw error;
    }
    return res.json();
};

interface SimilarDoubt {
    id: number;
    subject: string;
    content: string | null;
    isSolved: string | null;
    similarity: number;
    solvedAnswer?: string | null;
}

interface AskDoubtProps {
    defaultSubject?: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    doubtToEdit?: Doubt & { tags?: Tag[] };
    classroomId?: number | null;
    type?: string;
}

const MAX_CHARS = 500;

const SUBJECT_KEYWORDS: Record<string, string[]> = {
    Calculus: ["derivative", "integral", "limit", "differentiation", "maxima", "minima"],
    Algebra: ["equation", "polynomial", "matrix", "linear", "quadratic", "factor"],
    Geometry: ["triangle", "circle", "angle", "area", "perimeter", "theorem"],
    Physics: ["force", "motion", "velocity", "acceleration", "current", "voltage", "energy"],
    Chemistry: ["molecule", "reaction", "acid", "base", "organic", "periodic"],
    Biology: ["cell", "dna", "photosynthesis", "organ", "enzyme", "genetics"],
    Programming: ["code", "function", "react", "javascript", "python", "api", "bug"],
    "Data Structures": ["array", "linked list", "stack", "queue", "tree", "graph"],
    Algorithms: ["sort", "search", "complexity", "recursion", "dynamic programming"],
};

const suggestSubject = (text: string) => {
    const normalized = text.toLowerCase();
    return Object.entries(SUBJECT_KEYWORDS).find(([, keywords]) =>
        keywords.some((keyword) => normalized.includes(keyword))
    )?.[0] || "";
};

const suggestTags = (text: string, subject: string) => {
    const normalized = text.toLowerCase();
    const tags = new Set<string>();

    if (subject) tags.add(subject);
    Object.entries(SUBJECT_KEYWORDS).forEach(([topic, keywords]) => {
        if (keywords.some((keyword) => normalized.includes(keyword))) tags.add(topic);
    });

    return Array.from(tags).slice(0, 4);
};

export default function AskDoubt({ defaultSubject = "", isOpen, onClose, onSuccess, doubtToEdit, classroomId = null, type = 'community' }: AskDoubtProps) {
    const [content, setContent] = useState(doubtToEdit?.content || "");

    const maxLength = 500;
    const minLength = 20;
    const charCount = content.length;
    const hasContent = content.trim().length > 0;
    const isTooShort = hasContent && content.trim().length < minLength;
    const isTooLong = charCount > maxLength;
    const progressPercent = Math.min((charCount / maxLength) * 100, 100);

    let colorClass = "text-slate-400";
    if (isTooLong) {
        colorClass = "text-red-500";
    } else if (charCount >= maxLength * 0.8) {
        colorClass = "text-yellow-400";
    } else if (charCount >= minLength) {
        colorClass = "text-green-400";
    }

    let progressBarColor = "bg-blue-500";
    if (isTooLong) {
        progressBarColor = "bg-red-500";
    } else if (charCount >= maxLength * 0.8) {
        progressBarColor = "bg-yellow-400";
    } else if (charCount >= minLength) {
        progressBarColor = "bg-green-400";
    }
    const [subject, setSubject] = useState(doubtToEdit?.subject || defaultSubject);
    const [imageUrl, setImageUrl] = useState(doubtToEdit?.imageUrl || "");
    const [fileName, setFileName] = useState(
        doubtToEdit?.imageUrl ? (doubtToEdit.imageUrl.startsWith("data:application/pdf") ? "Attached Document.pdf" : "Existing Image") : ""
    );
    const [fileSize, setFileSize] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [userName, setUserName] = useState("");
    const [tags, setTags] = useState<string[]>(doubtToEdit?.tags?.map((tag: Tag) => tag.name) || []);
    const [tagDraft, setTagDraft] = useState("");

    const { data: suggestedTagsData } = useSWR<any[]>(
        isOpen && subject
            ? `/api/tags?subject=${encodeURIComponent(subject)}&classroomId=${classroomId || ""}`
            : null,
        fetcher
    );

    const suggestedTags = (Array.isArray(suggestedTagsData) ? suggestedTagsData : []).filter(
        (rec) => !tags.some((t) => t.toLowerCase() === rec.name.toLowerCase())
    );
    const [subjectWasEdited, setSubjectWasEdited] = useState(false);
    const [suggestedSubject, setSuggestedSubject] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
    const [similarDoubts, setSimilarDoubts] = useState<SimilarDoubt[]>([]);
    const [isCheckingSimilarity, setIsCheckingSimilarity] = useState(false);
    const [similarityChecked, setSimilarityChecked] = useState(false);
    const [expandedSolvedId, setExpandedSolvedId] = useState<number | null>(null);
    const similarityDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const checkSimilarity = async (text: string) => {
        if (doubtToEdit || text.trim().length < 20) {
            setSimilarDoubts([]);
            setSimilarityChecked(false);
            return;
        }
        setIsCheckingSimilarity(true);
        try {
            const res = await fetch("/api/doubts/check-similarity", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: text, classroomId }),
            });
            if (res.ok) {
                const data = await res.json();
                setSimilarDoubts(data.similarDoubts || []);
                setSimilarityChecked(true);
            }
        } catch (err) {
            console.error("Similarity check failed:", err);
        } finally {
            setIsCheckingSimilarity(false);
        }
    };

    const insertMarkdown = (type: "bold" | "italic" | "code" | "list") => {
        const textarea = contentTextareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selectedText = text.substring(start, end);

        let replacement = "";
        switch (type) {
            case "bold":
                replacement = `**${selectedText || "bold text"}**`;
                break;
            case "italic":
                replacement = `*${selectedText || "italic text"}*`;
                break;
            case "code":
                replacement = `\`${selectedText || "code"}\``;
                break;
            case "list":
                replacement = `\n- ${selectedText || "list item"}`;
                break;
        }

        const newContent = text.substring(0, start) + replacement + text.substring(end);
        setContent(newContent);

        setTimeout(() => {
            textarea.focus();
            const newCursorPos = start + replacement.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    };

    useEffect(() => {
        if (doubtToEdit) {
            setContent(doubtToEdit.content || "");
            setSubject(doubtToEdit.subject || defaultSubject);
            setImageUrl(doubtToEdit.imageUrl || "");
            setFileName(doubtToEdit.imageUrl ? (doubtToEdit.imageUrl.startsWith("data:application/pdf") ? "Attached Document.pdf" : "Existing Image") : "");
            setTags(doubtToEdit.tags?.map((tag: Tag) => tag.name) || []);
        } else {
            setSubject(defaultSubject);
            setTags([]);
            setSubjectWasEdited(false);
        }
    }, [defaultSubject, doubtToEdit]);

    useEffect(() => {
        if (content.trim().length < 20) {
            setSuggestedSubject("");
            setSimilarDoubts([]);
            setSimilarityChecked(false);
            return;
        }

        const detectedSubject = suggestSubject(content);
        setSuggestedSubject(detectedSubject);

        if (detectedSubject && !subjectWasEdited) {
            setSubject(detectedSubject);
        }

        // Debounced similarity check (fires 1.5s after user stops typing)
        if (similarityDebounceRef.current) clearTimeout(similarityDebounceRef.current);
        similarityDebounceRef.current = setTimeout(() => {
            checkSimilarity(content);
        }, 1500);

        return () => {
            if (similarityDebounceRef.current) clearTimeout(similarityDebounceRef.current);
        };
    }, [content, subjectWasEdited]);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) {
            window.addEventListener("keydown", handleEsc);
        }
        return () => window.removeEventListener("keydown", handleEsc);
    }, [isOpen, onClose]);

    useEffect(() => {
        let savedName = localStorage.getItem("anonymous_user");
        if (!savedName) {
            savedName = `Student_${Math.floor(Math.random() * 900) + 100}`;
            localStorage.setItem("anonymous_user", savedName);
        }
        setUserName(savedName);
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    const processFile = (file: File) => {
        if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
            toast.error("Only image (PNG, JPG, GIF, WebP) and PDF files are supported.");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error("File size exceeds 5MB limit.");
            return;
        }
        setFileName(file.name);
        setFileSize((file.size / (1024 * 1024)).toFixed(2));
        const reader = new FileReader();
        reader.onloadend = () => {
            setImageUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const addTag = (tagName: string) => {
        const cleanTag = tagName.trim().replace(/\s+/g, " ");
        if (!cleanTag) return;
        setTags((currentTags) => {
            if (currentTags.some((tag) => tag.toLowerCase() === cleanTag.toLowerCase())) {
                return currentTags;
            }
            return [...currentTags, cleanTag].slice(0, 8);
        });
        setTagDraft("");
    };

    const addSuggestedTags = () => {
        suggestTags(content, subject).forEach(addTag);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isTooLong) {
            toast.error("Character limit exceeded (500 characters)");
            return;
        }
        if (hasContent && isTooShort) {
            toast.error(`Question too short — minimum ${minLength} characters required`);
            return;
        }
        if (!subject.trim()) {
            toast.error("Please enter a subject before submitting.");
            return;
        }
        if (!content.trim() && !imageUrl) {
            toast.error("Please enter your doubt before submitting.");
            return;
        }

        setIsSubmitting(true);
        try {
            if (typeof navigator !== "undefined" && !navigator.onLine) {
                if (doubtToEdit) {
                    toast.error("You cannot edit doubts while offline.");
                    setIsSubmitting(false);
                    return;
                }

                const payload = { subject, content, imageUrl, classroomId, type, tags };
                const { addToQueue } = await import("@/lib/offline/syncQueue");
                await addToQueue("/api/doubts", "POST", payload);

                if ("serviceWorker" in navigator && "SyncManager" in window) {
                    try {
                        const reg = await navigator.serviceWorker.ready;
                        await (reg as any).sync.register("doubtDeskSyncQueue");
                    } catch (syncErr) {
                        console.warn("Background sync registration failed:", syncErr);
                    }
                }

                toast.success(OFFLINE_DOUBT_QUEUED, {
                    id: "doubt-offline-queued",
                });
                onSuccess();
                setIsSubmitting(false);
                return;
            }

            const url = doubtToEdit ? `/api/doubts/action/${doubtToEdit.id}` : "/api/doubts";
            const method = doubtToEdit ? "PATCH" : "POST";
            const body = doubtToEdit
                ? { action: "edit", content, subject, imageUrl, tags }
                : { subject, content, imageUrl, classroomId, type, tags };

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (res.ok) {
                onSuccess();
                toast.success(doubtToEdit ? "Doubt updated successfully!" : "Doubt posted successfully!", {
                    id: doubtToEdit ? `doubt-update-${doubtToEdit.id}` : "doubt-create",
                });
            } else {
                toast.error(data.error || "Failed to post doubt.", {
                    id: doubtToEdit ? `doubt-update-error-${doubtToEdit.id}` : "doubt-create-error",
                });
            }
        } catch (error) {
            console.error("Submission failed:", error);
            toast.error("An unexpected error occurred.", {
                id: doubtToEdit ? `doubt-update-error-${doubtToEdit.id}` : "doubt-create-error",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-white/60 dark:bg-slate-950/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-[1.5rem] sm:rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-5 sm:p-8 border-b border-slate-200 dark:border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic">
                            {doubtToEdit ? "Edit" : "Ask"} {type === 'teacher' ? <span className="text-purple-500">Teacher</span> : <span className="text-blue-500">Doubt</span>}
                        </h2>
                        <p className="text-slate-500 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">
                            Collaborative • Anonymous • {userName}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-600 dark:text-slate-400 transition-colors"
                        aria-label="Close modal"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form noValidate onSubmit={handleSubmit} className="p-5 sm:p-8 space-y-4 sm:space-y-6 max-h-[80vh] overflow-y-auto">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 dark:text-slate-500 px-1">Subject / Topic</label>
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => {
                                setSubject(e.target.value);
                                setSubjectWasEdited(true);
                            }}
                            placeholder="e.g. Quantum Mechanics, React Hooks, etc."
                            className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500/50 font-bold text-sm"
                            required
                        />
                        {subjectWasEdited && !subject.trim() && (
                        <p className="text-red-400 text-xs font-semibold px-1 mt-1">Subject is required.</p>
                        )}
                        {suggestedSubject && (
                            <div className="flex items-center gap-2 px-1 text-[10px] font-bold uppercase tracking-widest text-blue-300">
                                <Sparkles className="w-3 h-3" />
                                Suggested subject: {suggestedSubject}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSubject(suggestedSubject);
                                        setSubjectWasEdited(false);
                                    }}
                                    className="text-blue-400 hover:text-blue-200 underline underline-offset-4"
                                >
                                    Apply
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                            <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 dark:text-slate-500">Your Question (Optional if attachment added)</label>
                            <div className="flex items-center gap-1">
                                <button type="button" onClick={() => insertMarkdown("bold")} className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-slate-600 dark:text-slate-400"><Bold className="w-3 h-3" /></button>
                                <button type="button" onClick={() => insertMarkdown("italic")} className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-slate-600 dark:text-slate-400"><Italic className="w-3 h-3" /></button>
                                <button type="button" onClick={() => insertMarkdown("code")} className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-slate-600 dark:text-slate-400"><Code className="w-3 h-3" /></button>
                                <button type="button" onClick={() => insertMarkdown("list")} className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-slate-600 dark:text-slate-400"><List className="w-3 h-3" /></button>
                                <div className="w-px h-3 bg-slate-200 dark:bg-white/10 mx-1" />
                                <button
                                    type="button"
                                    onClick={() => setIsPreviewMode(!isPreviewMode)}
                                    className={`flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-black uppercase transition-all ${isPreviewMode ? 'bg-blue-500 text-white' : 'hover:bg-white/10 text-slate-400'}`}
                                >
                                    {isPreviewMode ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                    {isPreviewMode ? "Edit" : "Preview"}
                                </button>
                            </div>
                        </div>
                        {isPreviewMode ? (
                            <div className="w-full h-32 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-slate-900 dark:text-white text-sm overflow-y-auto">
                                <MarkdownRenderer content={content || "*Nothing to preview*"} />
                            </div>
                        ) : (
                            <>
                                <textarea
                                    ref={contentTextareaRef}
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Type your question here... (Markdown supported)"
                                    className={`w-full h-32 bg-slate-100 dark:bg-white/5 border rounded-2xl p-4 text-slate-900 dark:text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 transition-all resize-none ${
                                        isTooLong
                                            ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20"
                                            : isTooShort
                                            ? "border-yellow-500/50 focus:border-yellow-500/50 focus:ring-yellow-500/20"
                                            : charCount >= minLength
                                            ? "border-green-500/50 focus:border-green-500/50 focus:ring-green-500/20"
                                            : "border-slate-200 dark:border-white/10 focus:border-blue-500/50 focus:ring-blue-500/20"
                                    }`}
                                />

                                {/* Progress Bar */}
                                <div className="mt-2 h-1 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-300 ${progressBarColor}`}
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>

                                {/* Counter + Validation Message */}
                                <div className="flex items-center justify-between mt-1 px-1">
                                    <div className="text-xs">
                                        {isTooLong && (
                                            <span className="text-red-500 font-semibold">
                                                {charCount - maxLength} characters over limit
                                            </span>
                                        )}
                                        {isTooShort && !isTooLong && (
                                            <span className="text-yellow-400 font-semibold">
                                                {minLength - content.trim().length} more characters needed
                                            </span>
                                        )}
                                        {!isTooShort && !isTooLong && charCount >= minLength && (
                                            <span className="text-green-400 font-semibold">Looks good!</span>
                                        )}
                                        {charCount === 0 && (
                                            <span className="text-slate-500">Min {minLength} · Max {maxLength} characters</span>
                                        )}
                                    </div>
                                    <span className={`text-xs font-semibold ${colorClass}`}>
                                        {charCount} / {maxLength}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3 px-1">
                            <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 dark:text-slate-500">Tags</label>
                            <button
                                type="button"
                                onClick={addSuggestedTags}
                                disabled={!content.trim()}
                                className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-300 disabled:opacity-40"
                             aria-label="Interactive button">
                                <Sparkles className="w-3 h-3" /> Suggest
                            </button>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 focus-within:border-blue-500/50">
                            <Tags className="w-4 h-4 text-slate-500 dark:text-slate-500" />
                            <input
                                type="text"
                                value={tagDraft}
                                onChange={(e) => setTagDraft(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === ",") {
                                        e.preventDefault();
                                        addTag(tagDraft);
                                    }
                                }}
                                placeholder="Add a tag and press Enter"
                                className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-600 focus:outline-none"
                            />
                            <button
                                type="button"
                                onClick={() => addTag(tagDraft)}
                                className="text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            >
                                Add
                            </button>
                        </div>
                        {suggestedTags.length > 0 && (
                            <div className="flex flex-wrap gap-2 items-center px-1 py-1">
                                <span className="text-[9px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-widest">Recommended:</span>
                                {suggestedTags.map((tag) => (
                                    <button
                                        type="button"
                                        key={tag.id}
                                        onClick={() => addTag(tag.name)}
                                        className="px-3 py-1 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 text-blue-400 hover:text-blue-300 text-[10px] font-semibold rounded-full transition-all duration-300"
                                    >
                                        + {tag.name}
                                    </button>
                                ))}
                            </div>
                        )}
                        {tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {tags.map((tag) => (
                                    <button
                                        key={tag}
                                        type="button"
                                        onClick={() => setTags((currentTags) => currentTags.filter((item) => item !== tag))}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-200 text-[10px] font-bold"
                                    >
                                        {tag}
                                        <X className="w-3 h-3" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                            <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 dark:text-slate-500">Attach Visual or PDF (Max 5MB)</label>
                            <span className="text-[9px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-widest">PNG, JPG, GIF, WEBP, PDF</span>
                        </div>
                        <div
                            className="relative group"
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                        >
                            <input
                                type="file"
                                onChange={handleFileChange}
                                accept="image/png,image/jpeg,image/gif,image/webp,application/pdf"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className={`w-full py-8 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 transition-all ${isDragging ? 'bg-blue-500/10 border-blue-500/50 scale-[0.99]' : 'bg-white/[0.02] border-white/10 group-hover:bg-white/[0.05] group-hover:border-blue-500/30'}`}>
                                {fileName ? (
                                    imageUrl.startsWith("data:application/pdf") ? (
                                        <div className="flex flex-col items-center gap-2 px-6 text-center z-20">
                                            <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center shadow-lg animate-in zoom-in-95">
                                                <FileText className="w-8 h-8 text-red-500" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-slate-900 dark:text-white font-bold max-w-xs truncate">{fileName}</p>
                                                {fileSize && <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest mt-0.5">PDF Document • {fileSize} MB</p>}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setFileName(""); setImageUrl(""); setFileSize(""); }}
                                                className="mt-2 text-[10px] bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-slate-900 dark:hover:text-white px-4 py-1.5 rounded-xl font-black uppercase tracking-widest transition-all z-20"
                                            >
                                                Remove Attachment
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-3 px-6 text-center z-20">
                                            <div className="relative max-h-40 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-xl bg-white dark:bg-slate-950 animate-in zoom-in-95">
                                                <img src={imageUrl} alt="Preview" className="max-h-40 object-contain" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-900 dark:text-white font-bold max-w-xs truncate">{fileName}</p>
                                                {fileSize && <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest mt-0.5">Visual Image • {fileSize} MB</p>}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setFileName(""); setImageUrl(""); setFileSize(""); }}
                                                className="text-[10px] bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-slate-900 dark:hover:text-white px-4 py-1 rounded-xl font-black uppercase tracking-widest transition-all z-20"
                                            >
                                                Remove Attachment
                                            </button>
                                        </div>
                                    )
                                ) : (
                                    <>
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isDragging ? 'bg-blue-600/20 text-blue-400 scale-110' : 'bg-slate-800 text-slate-500 group-hover:text-blue-400 group-hover:scale-105'}`}>
                                            <Upload className="w-7 h-7" />
                                        </div>
                                        <div className="text-center px-4">
                                            <p className="text-xs text-slate-800 dark:text-slate-200 font-bold uppercase tracking-wider">
                                                {isDragging ? "Drop your file here!" : "Click or Drag File to Upload"}
                                            </p>
                                            <p className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-widest mt-1">
                                                Images (PNG, JPG, WebP) and PDF Documents up to 5MB
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Similar Doubts Panel ── */}
                    {!doubtToEdit && (
                        <div className="space-y-2">
                            {isCheckingSimilarity && (
                                <div className="flex items-center gap-2 px-4 py-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-400 text-xs font-bold">
                                    <Search className="w-3.5 h-3.5 animate-pulse" />
                                    Checking for similar questions…
                                </div>
                            )}

                            {!isCheckingSimilarity && similarityChecked && similarDoubts.length === 0 && (
                                <div className="flex items-center gap-2 px-4 py-3 bg-green-500/10 border border-green-500/20 rounded-2xl text-green-400 text-xs font-bold">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    No similar doubts found — your question looks unique!
                                </div>
                            )}

                            {!isCheckingSimilarity && similarDoubts.length > 0 && (
                                <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl overflow-hidden">
                                    <div className="flex items-center gap-2 px-4 py-3 bg-yellow-500/10 border-b border-yellow-500/20">
                                        <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0" />
                                        <span className="text-yellow-300 text-xs font-black uppercase tracking-widest">
                                            {similarDoubts.length} Similar Doubt{similarDoubts.length > 1 ? "s" : ""} Found — Already Answered?
                                        </span>
                                    </div>
                                    <div className="divide-y divide-yellow-500/10 max-h-64 overflow-y-auto">
                                        {similarDoubts.map((d) => (
                                            <div key={d.id} className="px-4 py-3 space-y-1.5">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-slate-900 dark:text-slate-200 text-xs font-bold line-clamp-2">
                                                            {d.content || "(Image/PDF attached)"}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500">
                                                                {d.subject}
                                                            </span>
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-blue-400">
                                                                {d.similarity}% match
                                                            </span>
                                                            {d.isSolved === "solved" ? (
                                                                <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-green-400">
                                                                    <CheckCircle2 className="w-3 h-3" /> Solved
                                                                </span>
                                                            ) : (
                                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Open</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <a
                                                        href={classroomId ? `/rooms/${classroomId}?doubt=${d.id}` : `/?doubt=${d.id}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="shrink-0 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-300 px-2 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 transition-colors"
                                                    >
                                                        View <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                </div>
                                                {d.isSolved === "solved" && d.solvedAnswer && (
                                                    <div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setExpandedSolvedId(expandedSolvedId === d.id ? null : d.id)}
                                                            className="text-[9px] font-black uppercase tracking-widest text-green-400 hover:text-green-300 underline underline-offset-4"
                                                        >
                                                            {expandedSolvedId === d.id ? "Hide Answer ▲" : "Show Answer ▼"}
                                                        </button>
                                                        {expandedSolvedId === d.id && (
                                                            <div className="mt-2 p-3 bg-green-500/5 border border-green-500/20 rounded-xl text-xs text-slate-300 overflow-y-auto max-h-32">
                                                                <MarkdownRenderer content={d.solvedAnswer} />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="px-4 py-2.5 bg-yellow-500/5 border-t border-yellow-500/10">
                                        <p className="text-[9px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-widest">
                                            If none of these answer your question, feel free to post anyway.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="pt-4 flex gap-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-900 dark:text-white rounded-2xl font-bold transition-all border border-slate-200 dark:border-white/5"
                         >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-[2] py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                         aria-label="Submit">
                            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            {doubtToEdit ? "Update Doubt" : "Post Doubt"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}