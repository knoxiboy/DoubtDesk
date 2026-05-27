import {
  ShieldCheck,
  Database,
  Cookie,
  Lock,
  Globe,
  Mail,
} from "lucide-react";

export const metadata = {
  title: "Privacy Policy",
  description: "Understand how DoubtDesk collects, stores, and protects your data.",
};

export default function PrivacyPolicyPage() {
  const sections = [
    {
      icon: ShieldCheck,
      title: "Information We Collect",
      content:
        "We collect basic account information such as your name, email address, authentication details, and profile information to provide a personalized and secure experience across DoubtDesk.",
    },
    {
      icon: Database,
      title: "How We Use Your Data",
      content:
        "Your information is used to improve platform functionality, enhance user experience, maintain account security, and provide personalized support and recommendations within the platform.",
    },
    {
      icon: Cookie,
      title: "Cookies & Authentication",
      content:
        "DoubtDesk may use cookies, authentication tokens, and session storage to securely maintain user sessions, remember preferences, and improve website performance.",
    },
    {
      icon: Globe,
      title: "Third-Party Services",
      content:
        "We may integrate trusted third-party services such as authentication providers, analytics tools, and cloud infrastructure services to improve reliability and functionality.",
    },
    {
      icon: Lock,
      title: "Data Protection & Security",
      content:
        "We prioritize user privacy and implement appropriate technical and organizational measures to protect your personal information from unauthorized access or misuse.",
    },
    {
      icon: Mail,
      title: "Contact & Policy Updates",
      content:
        "This Privacy Policy may be updated periodically as the platform evolves. Users are encouraged to review this page regularly. For any privacy-related concerns, please contact the DoubtDesk team.",
    },
  ];

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-zinc-100 transition-colors duration-500">
      
      {/* Immersive Background Ambient Lighting */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[400px] bg-gradient-to-b from-blue-500/10 dark:from-blue-500/5 to-transparent blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[350px] w-[350px] rounded-full bg-cyan-500/5 dark:bg-cyan-500/[0.02] blur-3xl" />
        <div className="absolute left-0 bottom-1/3 h-[400px] w-[400px] rounded-full bg-indigo-500/5 dark:bg-indigo-500/[0.02] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16 md:py-24 flex flex-col gap-12 sm:gap-16">
        
        {/* Hero Headers Section */}
        <div className="text-center space-y-4 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/5 dark:bg-blue-500/10 px-3.5 py-1 text-xs font-semibold tracking-wider uppercase text-blue-600 dark:text-blue-400 backdrop-blur-sm">
            <ShieldCheck className="h-3.5 w-3.5" />
            Privacy & Transparency
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
            Privacy Policy
          </h1>
          <p className="text-sm sm:text-base text-slate-500 dark:text-zinc-400 leading-relaxed">
            At DoubtDesk, protecting user privacy and maintaining transparency is a priority. This page explains how your data is collected, stored, and used while interacting with the platform.
          </p>
          <div className="text-xs font-medium text-slate-400 dark:text-zinc-600 pt-1">
            Last updated: May 2026
          </div>
        </div>

        {/* Responsive Block-style Glassmorphism Grid */}
        <div className="grid gap-6 md:grid-cols-2 relative z-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
          {sections.map((section, index) => {
            const Icon = section.icon;

            return (
              <div 
                key={index} 
                className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-zinc-900 bg-white/50 dark:bg-zinc-950/30 p-6 sm:p-8 backdrop-blur-md shadow-xl shadow-slate-200/30 dark:shadow-none transition-all duration-300 hover:border-blue-400/50 dark:hover:border-zinc-700 hover:bg-white/80 dark:hover:bg-zinc-900/40 hover:-translate-y-1"
              >
                {/* Micro Ambient Glow Layer inside card */}
                <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-br from-blue-500/[0.02] to-cyan-500/[0.02] pointer-events-none" />

                <div className="relative z-10 flex flex-col gap-4">
                  {/* Icon & Title Block */}
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 text-blue-600 dark:text-blue-400 shadow-sm transition-all duration-300 group-hover:bg-blue-600 group-hover:text-white dark:group-hover:bg-blue-500">
                      <Icon className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                    </div>
                    <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-800 dark:text-zinc-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors duration-200">
                      {section.title}
                    </h2>
                  </div>

                  {/* Policy Body Text */}
                  <p className="text-[14px] sm:text-[15px] text-slate-600 dark:text-zinc-400 leading-relaxed">
                    {section.content}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Glassmorphism Bottom Card Banner */}
        <div className="rounded-2xl border border-slate-200 dark:border-zinc-900 bg-white/40 dark:bg-zinc-950/20 p-8 text-center backdrop-blur-xl shadow-xl shadow-slate-200/20 dark:shadow-none animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            Your Privacy Matters
          </h3>
          <p className="mx-auto max-w-lg text-xs sm:text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">
            DoubtDesk is committed to maintaining a safe, transparent, and secure environment for all students and contributors using the platform.
          </p>
        </div>

      </div>
    </div>
  );
}