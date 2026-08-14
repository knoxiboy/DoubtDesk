import { useState, useEffect } from "react";
import { Loader2, BookOpen, ChevronDownIcon, Eye, EyeOff } from "lucide-react";
import * as Accordion from "@radix-ui/react-accordion";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch"; // Assuming there is a switch component, or we can use a native button/checkbox if missing. Let's use a standard button for safety.

export default function KnowledgeBaseView({ classroomId, role }: { classroomId: number, role?: string }) {
    const [faqs, setFaqs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const isTeacher = role === 'teacher' || role === 'owner' || role === 'admin';

    useEffect(() => {
        const fetchUrl = isTeacher 
            ? `/api/classrooms/${classroomId}/faqs` // Teachers see all
            : `/api/classrooms/${classroomId}/faqs?published=true`; // Students see only published
            
        fetch(fetchUrl)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setFaqs(data.data);
                }
            })
            .catch(err => console.error("Failed to load FAQs", err))
            .finally(() => setLoading(false));
    }, [classroomId, isTeacher]);

    const togglePublish = async (faqId: number, currentStatus: boolean) => {
        const newStatus = !currentStatus;
        
        // Optimistic UI update
        setFaqs(faqs.map(f => f.id === faqId ? { ...f, isPublished: newStatus } : f));
        
        try {
            const res = await fetch(`/api/classrooms/${classroomId}/faqs`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ faqId, isPublished: newStatus })
            });
            const data = await res.json();
            
            if (!data.success) {
                throw new Error(data.error);
            }
            toast.success(newStatus ? "FAQ published" : "FAQ unpublished");
        } catch (error: any) {
            toast.error(error.message || "Failed to update FAQ status");
            // Revert on error
            setFaqs(faqs.map(f => f.id === faqId ? { ...f, isPublished: currentStatus } : f));
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        );
    }

    if (faqs.length === 0) {
        return (
            <div className="text-center p-12 bg-white dark:bg-zinc-950/30 rounded-2xl border border-slate-200 dark:border-zinc-900">
                <BookOpen className="w-12 h-12 text-slate-300 dark:text-zinc-700 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-200 mb-2">No FAQs Available Yet</h3>
                <p className="text-slate-500 dark:text-zinc-500 text-sm">
                    {isTeacher ? "No FAQs have been generated for this classroom yet." : "The knowledge base is currently empty. Check back later!"}
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white/50 dark:bg-zinc-950/30 border border-slate-200 dark:border-zinc-900 rounded-3xl p-6 md:p-8 backdrop-blur-xl">
            <div className="mb-8">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                    <BookOpen className="w-6 h-6 text-purple-500" />
                    Knowledge Base
                </h2>
                <p className="text-slate-500 dark:text-zinc-400 mt-2 text-sm font-medium">
                    Frequently asked questions compiled from resolved doubts in this classroom.
                </p>
            </div>

            <Accordion.Root type="multiple" className="space-y-4">
                {faqs.map((faq) => (
                    <Accordion.Item
                        key={faq.id}
                        value={`faq-${faq.id}`}
                        className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden relative"
                    >
                        {isTeacher && (
                            <div className="absolute top-4 right-14 z-10">
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        togglePublish(faq.id, faq.isPublished);
                                    }}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${
                                        faq.isPublished 
                                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20" 
                                            : "bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-700"
                                    }`}
                                >
                                    {faq.isPublished ? <><Eye className="w-3.5 h-3.5" /> Published</> : <><EyeOff className="w-3.5 h-3.5" /> Hidden</>}
                                </button>
                            </div>
                        )}
                        <Accordion.Header>
                            <Accordion.Trigger className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors group [&[data-state=open]>svg]:rotate-180">
                                <div className="pr-24">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-purple-500 mb-1 block">
                                        {faq.topic}
                                    </span>
                                    <span className="text-sm font-bold text-slate-800 dark:text-zinc-200 block">
                                        {faq.question}
                                    </span>
                                </div>
                                <ChevronDownIcon className="w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200" />
                            </Accordion.Trigger>
                        </Accordion.Header>
                        <Accordion.Content className="text-slate-600 dark:text-zinc-400 text-sm leading-relaxed bg-slate-50 dark:bg-zinc-950/50 p-5 border-t border-slate-100 dark:border-zinc-800 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                            {faq.answer}
                        </Accordion.Content>
                    </Accordion.Item>
                ))}
            </Accordion.Root>
        </div>
    );
}
