import Link from 'next/link';
import { Home, AlertCircle } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#020617] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-1/4 -left-20 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-1/4 -right-20 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="relative z-10 space-y-8 max-w-xl">
                {/* Error Badge */}
                <div className="flex flex-col items-center space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest animate-pulse">
                        <AlertCircle className="w-3.5 h-3.5" /> Navigation Error
                    </div>

                    {/* Hero 404 Text */}
                    <h1 className="text-[120px] sm:text-[180px] font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-slate-800 leading-none tracking-tighter select-none drop-shadow-2xl">
                        404
                    </h1>
                </div>

                {/* Message Content */}
                <div className="space-y-4">
                    <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                        LOST IN THE <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 uppercase italic pr-2">Knowledge Base?</span>
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 text-lg font-medium max-w-md mx-auto leading-relaxed">
                        The resource you're searching for has moved to another dimension. Let's get your learning back on track.
                    </p>
                </div>

                {/* Action Button */}
                <div className="pt-6">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-slate-900 dark:text-white rounded-3xl font-black uppercase tracking-widest text-xs transition-all shadow-2xl shadow-blue-500/20 active:scale-95 group border border-slate-200 dark:border-white/10"
                    >
                        <Home className="w-4 h-4 transition-transform group-hover:-translate-y-1" />
                        Return to Dashboard
                    </Link>
                </div>
            </div>

            {/* Decorative Grid/Lines */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
        </div>
    );
}
