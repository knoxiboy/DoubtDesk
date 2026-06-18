"use client";

import { useState, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { toast } from "sonner";
import {
    Brain,
    Loader2,
    Send,
    Sparkles,
    CheckCircle2,
    XCircle,
    Lightbulb,
    RotateCcw,
    Trophy,
    Target,
    ChevronDown,
    ChevronUp,
} from "lucide-react";

interface PracticeModalProps {
    isOpen: boolean;
    onClose: () => void;
    doubtId: number;
    subject: string;
    subTopic?: string | null;
}

interface GradeResult {
    isCorrect: boolean;
    score: number;
    feedback: string;
    strengths: string[];
    improvements: string[];
    correctApproach: string | null;
}

type ModalPhase = "idle" | "generating" | "ready" | "submitting" | "graded";

export default function PracticeModal({
    isOpen,
    onClose,
    doubtId,
    subject,
    subTopic,
}: PracticeModalProps) {
    const [phase, setPhase] = useState<ModalPhase>("idle");
    const [question, setQuestion] = useState("");
    const [hint, setHint] = useState<string | null>(null);
    const [topic, setTopic] = useState("");
    const [attemptId, setAttemptId] = useState<number | null>(null);
    const [answer, setAnswer] = useState("");
    const [gradeResult, setGradeResult] = useState<GradeResult | null>(null);
    const [showHint, setShowHint] = useState(false);
    const [showCorrectApproach, setShowCorrectApproach] = useState(false);

    const resetState = useCallback(() => {
        setPhase("idle");
        setQuestion("");
        setHint(null);
        setTopic("");
        setAttemptId(null);
        setAnswer("");
        setGradeResult(null);
        setShowHint(false);
        setShowCorrectApproach(false);
    }, []);

    const handleClose = () => {
        resetState();
        onClose();
    };

    const generateQuestion = async () => {
        setPhase("generating");
        try {
            const res = await fetch(`/api/doubts/${doubtId}/practice/generate`, {
                method: "POST",
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error || "Failed to generate practice question");
                setPhase("idle");
                return;
            }

            setQuestion(data.question);
            setHint(data.hint || null);
            setTopic(data.topic || subject);
            setAttemptId(data.attemptId);
            setPhase("ready");
        } catch {
            toast.error("Network error. Please try again.");
            setPhase("idle");
        }
    };

    const submitAnswer = async () => {
        if (!answer.trim()) {
            toast.error("Please write your answer before submitting.");
            return;
        }

        if (!attemptId) {
            toast.error("No practice attempt found. Please generate a new question.");
            return;
        }

        setPhase("submitting");
        try {
            const res = await fetch(`/api/doubts/${doubtId}/practice/grade`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ attemptId, answer: answer.trim() }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error || "Failed to grade answer");
                setPhase("ready");
                return;
            }

            // Coerce/validate response shape to avoid runtime crashes (e.g. if fields from LLM differ)
            const coercedData: GradeResult = {
                isCorrect: typeof data.isCorrect === "boolean" ? data.isCorrect : false,
                score: typeof data.score === "number" ? data.score : 0,
                feedback: typeof data.feedback === "string" ? data.feedback : "No feedback available.",
                strengths: Array.isArray(data.strengths)
                    ? data.strengths
                    : (typeof data.strengths === "string" && data.strengths.trim() ? [data.strengths] : []),
                improvements: Array.isArray(data.improvements)
                    ? data.improvements
                    : (typeof data.improvements === "string" && data.improvements.trim() ? [data.improvements] : []),
                correctApproach: typeof data.correctApproach === "string" ? data.correctApproach : null,
            };

            setGradeResult(coercedData);
            setPhase("graded");

            if (coercedData.isCorrect) {
                toast.success("🎉 Spot on! You've mastered this concept!");
            } else {
                toast("💡 Almost there, review the feedback.", { icon: "📝" });
            }
        } catch {
            toast.error("Network error. Please try again.");
            setPhase("ready");
        }
    };

    const handleRetry = () => {
        setAnswer("");
        setGradeResult(null);
        setShowCorrectApproach(false);
        setPhase("idle");
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-950 border-white/10 text-white p-0">
                {/* Decorative gradient header */}
                <div className="relative overflow-hidden px-6 pt-6 pb-4">
                    <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-600/20 blur-[80px] rounded-full" />
                    <div className="absolute -top-10 -left-10 w-32 h-32 bg-purple-600/15 blur-[60px] rounded-full" />

                    <DialogHeader className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2.5 bg-gradient-to-br from-blue-600/30 to-purple-600/30 rounded-xl border border-blue-500/20">
                                <Brain className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-black text-white tracking-tight">
                                    Test My Understanding
                                </DialogTitle>
                                <DialogDescription className="text-xs text-slate-400 font-medium mt-0.5">
                                    {subTopic || subject} • AI-Powered Practice
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>
                </div>

                <div className="px-6 pb-6 space-y-5">
                    {/* ── IDLE: Generate button ── */}
                    {phase === "idle" && (
                        <div className="text-center py-10 space-y-6">
                            <div className="relative inline-flex">
                                <div className="w-20 h-20 bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-3xl flex items-center justify-center border border-blue-500/20">
                                    <Target className="w-9 h-9 text-blue-400" />
                                </div>
                                <Sparkles className="absolute -top-2 -right-2 w-5 h-5 text-yellow-400 animate-pulse" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-base mb-1.5">
                                    Ready to test your understanding?
                                </h3>
                                <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">
                                    AI will generate a conceptually similar problem. Solve it to
                                    reinforce your learning!
                                </p>
                            </div>
                            <button
                                onClick={generateQuestion}
                                className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-2xl font-bold text-sm transition-all shadow-xl shadow-blue-600/20 active:scale-[0.98] group"
                            >
                                <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                                Generate Practice Problem
                            </button>
                        </div>
                    )}

                    {/* ── GENERATING: Loading state ── */}
                    {phase === "generating" && (
                        <div className="text-center py-14 space-y-4">
                            <div className="relative inline-flex">
                                <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
                            </div>
                            <div>
                                <p className="text-white font-bold text-sm">
                                    Crafting your practice problem...
                                </p>
                                <p className="text-slate-500 text-xs mt-1">
                                    AI is analyzing the concept and creating a unique question
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ── READY: Question + Answer input ── */}
                    {(phase === "ready" || phase === "submitting") && (
                        <div className="space-y-5">
                            {/* Topic badge */}
                            <div className="flex items-center gap-2">
                                <span className="px-3 py-1 bg-blue-600/15 border border-blue-500/20 rounded-full text-[10px] font-black text-blue-400 uppercase tracking-widest">
                                    {topic}
                                </span>
                            </div>

                            {/* Question card */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <Brain className="w-4 h-4 text-blue-400" />
                                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                                        Practice Problem
                                    </span>
                                </div>
                                <div className="text-slate-200 text-sm leading-relaxed">
                                    <MarkdownRenderer
                                        content={question}
                                        className="practice-question-md"
                                    />
                                </div>
                            </div>

                            {/* Hint toggle */}
                            {hint && (
                                <button
                                    onClick={() => setShowHint(!showHint)}
                                    aria-expanded={showHint}
                                    aria-controls="practice-hint"
                                    className="flex items-center gap-2 text-xs text-yellow-400/80 hover:text-yellow-400 transition-colors group"
                                >
                                    <Lightbulb className="w-3.5 h-3.5" />
                                    <span className="font-bold">
                                        {showHint ? "Hide Hint" : "Need a Hint?"}
                                    </span>
                                    {showHint ? (
                                        <ChevronUp className="w-3 h-3" />
                                    ) : (
                                        <ChevronDown className="w-3 h-3" />
                                    )}
                                </button>
                            )}

                            {showHint && hint && (
                                <div
                                    id="practice-hint"
                                    className="bg-yellow-500/5 border border-yellow-500/15 rounded-xl px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-300"
                                >
                                    <p className="text-yellow-300/90 text-xs leading-relaxed">
                                        💡 {hint}
                                    </p>
                                </div>
                            )}

                            {/* Answer textarea */}
                            <div className="space-y-2">
                                <label
                                    htmlFor="practice-answer-input"
                                    className="text-[10px] font-black text-slate-400 uppercase tracking-widest"
                                >
                                    Your Answer
                                </label>
                                <Textarea
                                    id="practice-answer-input"
                                    value={answer}
                                    onChange={(e) => setAnswer(e.target.value)}
                                    placeholder="Write your step-by-step solution here..."
                                    rows={6}
                                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 rounded-xl focus:border-blue-500/40 focus:ring-blue-500/20 resize-y"
                                    disabled={phase === "submitting"}
                                />
                                <p className="text-[10px] text-slate-600 font-medium">
                                    Show your work step-by-step for the best feedback.
                                    Use LaTeX ($...$) for math if needed.
                                </p>
                            </div>

                            {/* Submit button */}
                            <button
                                onClick={submitAnswer}
                                disabled={
                                    phase === "submitting" || answer.trim().length === 0
                                }
                                className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-2xl font-bold text-sm transition-all active:scale-[0.98] shadow-lg shadow-blue-600/20"
                            >
                                {phase === "submitting" ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Grading...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Submit for Grading
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* ── GRADED: Results ── */}
                    {phase === "graded" && gradeResult && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Score banner */}
                            <div
                                className={`rounded-2xl p-5 border ${
                                    gradeResult.isCorrect
                                        ? "bg-emerald-500/10 border-emerald-500/20"
                                        : "bg-orange-500/10 border-orange-500/20"
                                }`}
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    {gradeResult.isCorrect ? (
                                        <div className="p-2 bg-emerald-500/20 rounded-xl">
                                            <Trophy className="w-6 h-6 text-emerald-400" />
                                        </div>
                                    ) : (
                                        <div className="p-2 bg-orange-500/20 rounded-xl">
                                            <Target className="w-6 h-6 text-orange-400" />
                                        </div>
                                    )}
                                    <div>
                                        <h3
                                            className={`font-black text-base ${
                                                gradeResult.isCorrect
                                                    ? "text-emerald-400"
                                                    : "text-orange-400"
                                            }`}
                                        >
                                            {gradeResult.isCorrect
                                                ? "Excellent Work! 🎉"
                                                : "Keep Going! 💪"}
                                        </h3>
                                        <p className="text-slate-400 text-xs font-medium">
                                            Score: {gradeResult.score}/100
                                        </p>
                                    </div>
                                </div>

                                {/* Score bar */}
                                <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 ease-out ${
                                            gradeResult.isCorrect
                                                ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                                                : "bg-gradient-to-r from-orange-500 to-yellow-400"
                                        }`}
                                        style={{ width: `${gradeResult.score}%` }}
                                    />
                                </div>
                            </div>

                            {/* Feedback */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                                    Detailed Feedback
                                </h4>
                                <div className="text-slate-300 text-sm leading-relaxed">
                                    <MarkdownRenderer
                                        content={gradeResult.feedback}
                                        className="practice-feedback-md"
                                    />
                                </div>
                            </div>

                            {/* Strengths */}
                            {gradeResult.strengths.length > 0 && (
                                <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                                            What You Did Well
                                        </span>
                                    </div>
                                    <ul className="space-y-1.5">
                                        {gradeResult.strengths.map((s, i) => (
                                            <li
                                                key={i}
                                                className="text-slate-300 text-xs flex items-start gap-2"
                                            >
                                                <span className="text-emerald-400 mt-0.5">•</span>
                                                {s}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Improvements */}
                            {gradeResult.improvements.length > 0 && (
                                <div className="bg-orange-500/5 border border-orange-500/15 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <XCircle className="w-3.5 h-3.5 text-orange-400" />
                                        <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">
                                            Areas to Improve
                                        </span>
                                    </div>
                                    <ul className="space-y-1.5">
                                        {gradeResult.improvements.map((imp, i) => (
                                            <li
                                                key={i}
                                                className="text-slate-300 text-xs flex items-start gap-2"
                                            >
                                                <span className="text-orange-400 mt-0.5">•</span>
                                                {imp}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Correct approach (toggleable) */}
                            {gradeResult.correctApproach && !gradeResult.isCorrect && (
                                <>
                                    <button
                                        onClick={() =>
                                            setShowCorrectApproach(!showCorrectApproach)
                                        }
                                        aria-expanded={showCorrectApproach}
                                        aria-controls="practice-correct-approach"
                                        className="flex items-center gap-2 text-xs text-blue-400/80 hover:text-blue-400 transition-colors"
                                    >
                                        <Lightbulb className="w-3.5 h-3.5" />
                                        <span className="font-bold">
                                            {showCorrectApproach
                                                ? "Hide Correct Approach"
                                                : "View Correct Approach"}
                                        </span>
                                        {showCorrectApproach ? (
                                            <ChevronUp className="w-3 h-3" />
                                        ) : (
                                            <ChevronDown className="w-3 h-3" />
                                        )}
                                    </button>

                                    {showCorrectApproach && (
                                        <div
                                            id="practice-correct-approach"
                                            className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-4 animate-in fade-in slide-in-from-top-2 duration-300"
                                        >
                                            <div className="text-slate-300 text-sm leading-relaxed">
                                                <MarkdownRenderer
                                                    content={gradeResult.correctApproach}
                                                    className="practice-approach-md"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Try Again button */}
                            <button
                                onClick={handleRetry}
                                className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold text-sm transition-all border border-white/10 active:scale-[0.98] group"
                            >
                                <RotateCcw className="w-4 h-4 group-hover:rotate-[-180deg] transition-transform duration-500" />
                                Try Another Problem
                            </button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
