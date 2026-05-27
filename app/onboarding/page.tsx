"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppUser } from "../provider";
import { GraduationCap, School, Mail, UserCircle, Loader2, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function OnboardingPage() {
    const { appUser, refresh } = useAppUser();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        university: "",
        year: "1st Year",
        role: "student",
        collegeEmail: ""
    });

    useEffect(() => {
        if (appUser?.onboarded) {
            router.push("/rooms");
        }
    }, [appUser, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const res = await fetch("/api/user/onboard", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                toast.success("Welcome aboard!");
                await refresh();
                router.push("/rooms");
            } else {
                toast.error("Failed to save details. Please try again.");
            }
        } catch (error) {
            toast.error("Something went wrong.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center p-6 relative overflow-hidden transition-colors duration-500">
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-500/10 dark:from-blue-500/5 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0" />
            <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-500/5 dark:bg-purple-500/[0.02] blur-[120px] rounded-full translate-x-1/3 translate-y-1/3 pointer-events-none z-0" />

            <div className="w-full max-w-xl relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="text-center mb-6 space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/5 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest animate-pulse backdrop-blur-sm">
                        <Sparkles className="w-3.5 h-3.5" /> Initialize Experience
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                        Academic Identity
                    </h1>
                    <p className="text-slate-500 dark:text-zinc-400 font-medium text-sm leading-relaxed">
                        Tailoring DoubtDesk for your specific learning ecosystem.
                    </p>
                </div>

                <div className="bg-white/50 dark:bg-zinc-950/30 border border-slate-200 dark:border-zinc-900 p-6 md:p-8 rounded-2xl backdrop-blur-xl shadow-xl shadow-slate-200/5 dark:shadow-none space-y-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-3 gap-3">
                            {['student', 'teacher', 'admin'].map((role) => (
                                <button
                                    key={role}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, role: role as any })}
                                    className={`py-4 rounded-xl border transition-all duration-300 flex flex-col items-center gap-2 font-semibold ${ formData.role === role ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20" : "bg-slate-50/50 dark:bg-zinc-900/20 border-slate-200 dark:border-zinc-900 text-slate-400 dark:text-zinc-500 hover:bg-slate-100 dark:hover:bg-zinc-900/40" }`}
                                >
                                    {role === 'student' && <GraduationCap className="w-5 h-5" />}
                                    {role === 'teacher' && <UserCircle className="w-5 h-5" />}
                                    {role === 'admin' && <ShieldCheck className="w-5 h-5" />}
                                    <span className="text-[10px] uppercase tracking-wider">{role}</span>
                                </button>
                            ))}
                        </div>

                        <div className="space-y-2">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 px-1 flex items-center gap-2">
                                <School className="w-4 h-4 text-blue-600 dark:text-blue-400" /> University / College Name
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.university}
                                onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                                placeholder="e.g. Stanford University"
                                className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 transition-all font-medium"
                            />
                        </div>

                        <div className={`grid grid-cols-1 ${formData.role === 'student' ? 'md:grid-cols-2' : ''} gap-4`}>
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 px-1 flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" /> College Email
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={formData.collegeEmail}
                                    onChange={(e) => setFormData({ ...formData, collegeEmail: e.target.value })}
                                    placeholder="yourname@college.edu"
                                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 transition-all font-medium"
                                />
                            </div>

                            {formData.role === 'student' && (
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 px-1">Your Year</label>
                                    <select
                                        value={formData.year}
                                        onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                                        className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500/50 transition-all font-medium appearance-none cursor-pointer"
                                    >
                                        <option className="bg-white dark:bg-zinc-900" value="1st Year">1st Year</option>
                                        <option className="bg-white dark:bg-zinc-900" value="2nd Year">2nd Year</option>
                                        <option className="bg-white dark:bg-zinc-900" value="3rd Year">3rd Year</option>
                                        <option className="bg-white dark:bg-zinc-900" value="Final Year">Final Year</option>
                                        <option className="bg-white dark:bg-zinc-900" value="Alumni/Other">Other</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold uppercase tracking-wider transition-all duration-300 shadow-lg shadow-blue-600/10 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Complete Setup <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>

                    <p className="text-center text-[10px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider">
                        Your identity helps us connect you with relevant classmates & classrooms.
                    </p>
                </div>
            </div>
        </div>
    );
}