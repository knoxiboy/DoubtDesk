import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import ResourceShare from './ResourceShare';
import { Send } from 'lucide-react';

const socket = io(); // Will be configured for server later

interface Message {
  user: string;
  text: string;
}

export default function ChatWindow({ room }: { room: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [user] = useState('User' + Math.floor(Math.random() * 1000));
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    socket.emit('join', room);
    socket.on('message', (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    });
    return () => {
      socket.off('message');
      socket.emit('leave', room);
    };
  }, [room]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const msg = { user, text: input };
    socket.emit('message', { ...msg, room });
    setMessages((prev) => [...prev, msg]);
    setInput('');
  };

  return (
    <div className="flex h-full min-h-[620px] flex-col">
      <div className="border-b border-white/10 px-5 py-5 sm:px-7">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#AABFFF]">Live discussion</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#F2F5FF]">Room: {room}</h2>
          </div>
          <div className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-200">
            Online
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-7">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="flex min-h-[320px] items-center justify-center text-center">
              <div className="max-w-sm rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-7">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#AABFFF]">No messages yet</p>
                <p className="mt-3 text-sm leading-7 text-slate-300/80">
                  Start the conversation with a doubt, note, or resource for the room.
                </p>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => {
            const isOwnMessage = msg.user === user;

            return (
              <div key={idx} className={`flex items-start gap-3 ${isOwnMessage ? 'justify-end' : ''}`}>
                {!isOwnMessage && (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xs font-bold text-[#AABFFF] ring-1 ring-white/10">
                    {msg.user.slice(0, 2).toUpperCase()}
                  </div>
                )}

                <div className={`max-w-[78%] ${isOwnMessage ? 'text-right' : ''}`}>
                  <div className="mb-1 text-xs font-bold text-slate-400">{isOwnMessage ? 'You' : msg.user}</div>
                  <div
                    className={`break-words rounded-2xl px-4 py-3 text-sm leading-6 shadow-lg ${
                      isOwnMessage
                        ? 'rounded-tr-sm bg-[#5E8CFF] text-white shadow-[#5E8CFF]/20'
                        : 'rounded-tl-sm border border-white/10 bg-white/[0.07] text-slate-100'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>

                {isOwnMessage && (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#5E8CFF] text-xs font-bold text-white ring-1 ring-[#AABFFF]/35">
                    {user.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-white/10 bg-[#020617]/35 p-4 sm:p-5">
        <form onSubmit={sendMessage} className="flex gap-3">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type a message..."
            className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-[#8BB8FF]/50 focus:ring-2 focus:ring-[#5E8CFF]/20"
          />
          <button
            type="submit"
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#5E8CFF] text-white shadow-[0_0_18px_rgba(94,140,255,0.3)] transition hover:bg-[#8BB8FF] focus:outline-none focus:ring-2 focus:ring-[#AABFFF]/40"
            aria-label="Send message"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      <ResourceShare onShare={(resource) => {
        const msg = { user, text: resource };
        socket.emit('message', { ...msg, room });
        setMessages((prev) => [...prev, msg]);
      }} />
      </div>
    </div>
  );
}
