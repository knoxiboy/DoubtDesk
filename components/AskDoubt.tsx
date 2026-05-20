"use client";

import { useState, useEffect, useRef } from "react";
import { X, Loader2, Upload, File, Eye, EyeOff, Bold, Italic, Code, List, Tags, Sparkles, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import MarkdownRenderer from "./MarkdownRenderer";

interface AskDoubtProps {
    defaultSubject?: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    doubtToEdit?: any;
    classroomId?: number | null;
    type?: string;
}

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

/**
 * AskDoubt Component
 * A modal form for students to submit doubts to the community or a specific classroom.
 * Features:
 * - Anonymous user identification via localStorage
 * - Image & PDF attachment support with base64 conversion and 5MB validation
 * - Edit mode for existing doubts
 */
export default function AskDoubt({ defaultSubject = "", isOpen, onClose, onSuccess, doubtToEdit, classroomId = null, type = 'community' }: AskDoubtProps) {
    const [content, setContent] = useState(doubtToEdit?.content || "");
    const maxLength = 500;
    const charCount = content.length;
    let colorClass = "text-slate-400";

if (charCount >= maxLength) {
  colorClass = "text-red-500";
} else if (charCount >= maxLength * 0.8) {
  colorClass = "text-yellow-400";
}
    const [subject, setSubject] = useState(doubtToEdit?.subject || defaultSubject);
    const [imageUrl, setImageUrl] = useState(doubtToEdit?.imageUrl || "");
    const [fileName, setFileName] = useState(
        doubtToEdit?.imageUrl ? (doubtToEdit.imageUrl.startsWith("data:application/pdf") ? "Attached Document.pdf" : "Existing Image") : ""
    );
    const [fileSize, setFileSize] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [userName, setUserName] = useState("");
    const [tags, setTags] = useState<string[]>(doubtToEdit?.tags?.map((tag: any) => tag.name) || []);
    const [tagDraft, setTagDraft] = useState("");
    const [subjectWasEdited, setSubjectWasEdited] = useState(false);
    const [suggestedSubject, setSuggestedSubject] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

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

        // Reset cursor pos and focus
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
            setTags(doubtToEdit.tags?.map((tag: any) => tag.name) || []);
        } else {
            setSubject(defaultSubject);
            setTags([]);
            setSubjectWasEdited(false);
        }
    }, [defaultSubject, doubtToEdit]);

    useEffect(() => {
        if (content.trim().length < 20) {
            setSuggestedSubject("");
            return;
        }

        const detectedSubject = suggestSubject(content);
        setSuggestedSubject(detectedSubject);

        if (detectedSubject && !subjectWasEdited) {
            setSubject(detectedSubject);
        }
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
        if (charCount > maxLength) {
            toast.error("Character limit exceeded (500)");
            return;
            }
        if ((!content.trim() && !imageUrl) || !subject.trim()) return;

        setIsSubmitting(true);
        try {
            const url = doubtToEdit ? `/api/doubts/action/${doubtToEdit.id}` : "/api/doubts";
            const method = doubtToEdit ? "PATCH" : "POST";
            const body = doubtToEdit 
                ? { action: "edit", content, subject, imageUrl, tags }
                : { userName, subject, content, imageUrl, classroomId, type, tags };

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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tight uppercase italic">
                            {doubtToEdit ? "Edit" : "Ask"} {type === 'teacher' ? <span className="text-purple-500">Teacher</span> : <span className="text-blue-500">Doubt</span>}
                        </h2>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">
                            Collaborative • Anonymous • {userName}
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-full text-slate-400 transition-colors"
                        aria-label="Close modal"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 px-1">Subject / Topic</label>
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => {
                                setSubject(e.target.value);
                                setSubjectWasEdited(true);
                            }}
                            placeholder="e.g. Quantum Mechanics, React Hooks, etc."
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-blue-500/50 font-bold text-sm"
                            required
                        />
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
                            <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Your Question (Optional if attachment added)</label>
                            <div className="flex items-center gap-1">
                                <button type="button" onClick={() => insertMarkdown("bold")} className="p-1.5 hover:bg-white/10 rounded text-slate-400"><Bold className="w-3 h-3" /></button>
                                <button type="button" onClick={() => insertMarkdown("italic")} className="p-1.5 hover:bg-white/10 rounded text-slate-400"><Italic className="w-3 h-3" /></button>
                                <button type="button" onClick={() => insertMarkdown("code")} className="p-1.5 hover:bg-white/10 rounded text-slate-400"><Code className="w-3 h-3" /></button>
                                <button type="button" onClick={() => insertMarkdown("list")} className="p-1.5 hover:bg-white/10 rounded text-slate-400"><List className="w-3 h-3" /></button>
                                <div className="w-px h-3 bg-white/10 mx-1" />
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
                            <div className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm overflow-y-auto">
                                <MarkdownRenderer content={content || "*Nothing to preview*"} />
                            </div>
                        ) : (
                            <>
                                <textarea
                                    ref={contentTextareaRef}
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                                            e.preventDefault();
                                            if (content.trim() || imageUrl) {
                                                handleSubmit(e as any);
                                            }
                                        }
                                    }}
                                    placeholder="Type your question here... (Markdown supported)"
                                    className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all resize-none"
                                />
                                <p className={`text-xs text-right mt-1 ${colorClass}`}>
                                    {charCount} / {maxLength}
                                </p>
                            </>
                        )}
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3 px-1">
                            <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Tags</label>
                            <button
                                type="button"
                                onClick={addSuggestedTags}
                                disabled={!content.trim()}
                                className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-300 disabled:opacity-40"
                            >
                                <Sparkles className="w-3 h-3" /> Suggest
                            </button>
                        </div>
                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-blue-500/50">
                            <Tags className="w-4 h-4 text-slate-500" />
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
                                className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 focus:outline-none"
                            />
                            <button
                                type="button"
                                onClick={() => addTag(tagDraft)}
                                className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white"
                            >
                                Add
                            </button>
                        </div>
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
                            <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Attach Visual or PDF (Max 5MB)</label>
                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">PNG, JPG, GIF, WEBP, PDF</span>
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
                            <div className={`w-full py-8 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 transition-all ${
                                isDragging ? 'bg-blue-500/10 border-blue-500/50 scale-[0.99]' : 'bg-white/[0.02] border-white/10 group-hover:bg-white/[0.05] group-hover:border-blue-500/30'
                            }`}>
                                {fileName ? (
                                    imageUrl.startsWith("data:application/pdf") ? (
                                        <div className="flex flex-col items-center gap-2 px-6 text-center z-20">
                                            <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center shadow-lg animate-in zoom-in-95">
                                                <FileText className="w-8 h-8 text-red-500" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-white font-bold max-w-xs truncate">{fileName}</p>
                                                {fileSize && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">PDF Document • {fileSize} MB</p>}
                                            </div>
                                            <button 
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setFileName(""); setImageUrl(""); setFileSize(""); }}
                                                className="mt-2 text-[10px] bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white px-4 py-1.5 rounded-xl font-black uppercase tracking-widest transition-all z-20"
                                            >
                                                Remove Attachment
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-3 px-6 text-center z-20">
                                            <div className="relative max-h-40 rounded-xl overflow-hidden border border-white/10 shadow-xl bg-slate-950 animate-in zoom-in-95">
                                                <img src={imageUrl} alt="Preview" className="max-h-40 object-contain" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-white font-bold max-w-xs truncate">{fileName}</p>
                                                {fileSize && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Visual Image • {fileSize} MB</p>}
                                            </div>
                                            <button 
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setFileName(""); setImageUrl(""); setFileSize(""); }}
                                                className="text-[10px] bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white px-4 py-1 rounded-xl font-black uppercase tracking-widest transition-all z-20"
                                            >
                                                Remove Attachment
                                            </button>
                                        </div>
                                    )
                                ) : (
                                    <>
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                                            isDragging ? 'bg-blue-600/20 text-blue-400 scale-110' : 'bg-slate-800 text-slate-500 group-hover:text-blue-400 group-hover:scale-105'
                                        }`}>
                                            <Upload className="w-7 h-7" />
                                        </div>
                                        <div className="text-center px-4">
                                            <p className="text-xs text-slate-200 font-bold uppercase tracking-wider">
                                                {isDragging ? "Drop your file here!" : "Click or Drag File to Upload"}
                                            </p>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                                                Images (PNG, JPG, WebP) and PDF Documents up to 5MB
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-all border border-white/5"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || (!content.trim() && !imageUrl) || !subject.trim()}
                            className="flex-[2] py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            {doubtToEdit ? "Update Doubt" : "Post Doubt"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
