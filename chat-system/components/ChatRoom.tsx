import React, { useState } from 'react';
import ChatWindow from './ChatWindow';
import Link from 'next/link';
import { ArrowLeft, MessageCircle } from 'lucide-react';

export default function ChatRoom() {
  const [room] = useState('general');
  return (
    <div className="min-h-screen bg-[#020617] px-5 py-6 text-[#F3F6FF] sm:px-8">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_24%_20%,rgba(94,140,255,0.18),transparent_28%),radial-gradient(circle_at_76%_40%,rgba(170,191,255,0.1),transparent_24%)]" />
      <div className="relative z-[1] mx-auto flex min-h-[calc(100vh-48px)] max-w-5xl flex-col">
        <header className="mb-6 flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5E8CFF] text-white shadow-[0_0_18px_rgba(94,140,255,0.35)]">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div className="text-right">
              <h1 className="text-lg font-bold tracking-tight">Classroom Chat</h1>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#94A3B8]">{room} room</p>
            </div>
          </div>
        </header>

        <section className="flex-1 rounded-[2rem] border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/25 backdrop-blur-xl">
          <ChatWindow room={room} />
        </section>
      </div>
    </div>
  );
}
