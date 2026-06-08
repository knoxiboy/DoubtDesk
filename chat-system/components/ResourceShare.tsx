import React, { useState } from 'react';
import { Paperclip } from 'lucide-react';

export default function ResourceShare({ onShare }: { onShare: (resource: string) => void }) {
  const [resource, setResource] = useState('');
  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        if (!resource.trim()) return;
        onShare(resource);
        setResource('');
      }}
      className="mt-3 flex gap-3"
    >
      <input
        value={resource}
        onChange={e => setResource(e.target.value)}
        placeholder="Paste a link, code, or resource..."
        className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-[#8BB8FF]/50 focus:ring-2 focus:ring-[#5E8CFF]/20"
      />
      <button
        type="submit"
        className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white px-4 text-sm font-bold text-slate-950 shadow-[0_10px_24px_rgba(15,23,42,0.18)] transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#AABFFF]/40"
      >
        <Paperclip className="h-4 w-4" />
        <span className="hidden sm:inline">Share</span>
      </button>
    </form>
  );
}
