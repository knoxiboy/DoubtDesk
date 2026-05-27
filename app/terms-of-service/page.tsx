"use client";

import {
  FileText,
  Shield,
  UserCheck,
  Ban,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

export default function TermsOfServicePage() {
  const sections = [
    {
      icon: UserCheck,
      title: "User Responsibilities",
      content:
        "By using DoubtDesk, users agree to interact respectfully, provide accurate information, and avoid misuse of the platform. Users are responsible for maintaining the security of their accounts and activities performed under them.",
    },
    {
      icon: Shield,
      title: "Acceptable Use",
      content:
        "Users must not engage in harmful, abusive, illegal, or disruptive behavior while using the platform. Any activity that compromises security, violates laws, or negatively impacts other users may result in account restrictions or removal.",
    },
    {
      icon: FileText,
      title: "Content Ownership",
      content:
        "Users retain ownership of the content they create or upload. However, by using DoubtDesk, users grant the platform permission to display and process submitted content for educational and platform-related purposes.",
    },
    {
      icon: Ban,
      title: "Account Suspension & Termination",
      content:
        "DoubtDesk reserves the right to suspend or terminate accounts that violate platform policies, misuse services, or engage in activities that threaten the safety and integrity of the community.",
    },
    {
      icon: AlertTriangle,
      title: "Limitation of Liability",
      content:
        "DoubtDesk is provided on an 'as-is' basis. While we strive for reliability and accuracy, we do not guarantee uninterrupted access or error-free functionality. Users are responsible for evaluating the suitability of the platform for their needs.",
    },
    {
      icon: RefreshCw,
      title: "Policy Updates",
      content:
        "These Terms of Service may be updated periodically to reflect platform improvements, legal requirements, or policy changes. Continued use of DoubtDesk after updates constitutes acceptance of the revised terms.",
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-black text-slate-900 dark:text-zinc-100 p-4 md:p-8 relative overflow-hidden transition-colors duration-500">
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-purple-500/10 dark:from-purple-500/5 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-emerald-500/5 dark:bg-emerald-500/[0.02] blur-[120px] rounded-full translate-x-1/3 translate-y-1/3 pointer-events-none z-0" />

      <div className="relative z-10 mx-auto max-w-5xl px-2 py-12 md:py-20 space-y-12">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/5 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest backdrop-blur-sm">
            <FileText className="h-3.5 w-3.5" /> Platform Guidelines & Policies
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight">
            Terms of Service
          </h1>

          <p className="mx-auto max-w-2xl text-slate-500 dark:text-zinc-400 text-sm font-medium leading-relaxed">
            These Terms of Service outline the rules, responsibilities, and conditions for using DoubtDesk. By accessing or using the platform, you agree to comply with these terms and community guidelines.
          </p>

          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
            Last updated: May 2026
          </div>
        </div>

        <div className="grid gap-6">
          {sections.map((section, index) => {
            const Icon = section.icon;

            return (
              <div
                key={index}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-zinc-900 bg-white/50 dark:bg-zinc-950/30 p-6 md:p-8 backdrop-blur-xl transition-all duration-300 shadow-xl shadow-slate-200/5 dark:shadow-none"
              >
                <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-start">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 shadow-sm">
                    <Icon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                      {section.title}
                    </h2>
                    <p className="text-sm font-medium text-slate-600 dark:text-zinc-400 leading-relaxed">
                      {section.content}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-zinc-900 bg-slate-50/50 dark:bg-zinc-950/20 p-6 md:p-8 text-center backdrop-blur-sm shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-2">
            Fair Usage & Community Safety
          </h3>
          <p className="mx-auto max-w-xl text-xs font-medium text-slate-500 dark:text-zinc-400 leading-relaxed">
            Our goal is to maintain a respectful, secure, and collaborative learning environment for every student and contributor on DoubtDesk.
          </p>
        </div>
      </div>
    </div>
  );
}