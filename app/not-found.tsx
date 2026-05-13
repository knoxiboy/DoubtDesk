import Link from "next/link";
import { Home, AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center selection:bg-blue-500/30">
      <div className="text-center px-6 max-w-md">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-6 shadow-[0_0_30px_rgba(37,99,235,0.3)]">
          <AlertTriangle className="w-10 h-10" />
        </div>

        <h1 className="text-6xl font-black text-white mb-3">404</h1>
        <p className="text-xl text-slate-400 mb-8 leading-relaxed">
          Oops! This page doesn&apos;t exist.
        </p>

        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all"
        >
          <Home className="w-4 h-4" />
          Go back to Home
        </Link>
      </div>
    </div>
  );
}
