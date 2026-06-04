'use client'

import { useState, useEffect } from 'react';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useParams } from 'next/navigation';

type Member = {
    userEmail: string;
    role: string;
    joinedAt: string;
};

export default function MembersListView() {
    const { id } = useParams();
    const [members, setMembers] = useState<Member[]>([]);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);

    useEffect(() => {
        if (!id) return;
        const fetchMembers = async () => {
            try {
                setLoading(true);
                const res = await fetch(
                    `/api/rooms/members?classroomId=${id}&limit=5&page=${page}`
                );
                const data = await res.json();

                setMembers(data.members ?? []);
                setTotalPages(data.pagination?.totalPages ?? 1);
            } catch (error) {
                console.error('Failed to fetch members:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchMembers();
    }, [id, page]);

    return (
        <div className="space-y-3 min-h-[400px] flex flex-col justify-between">
            {/* Main Content Area */}
            <div className="flex-1 space-y-3">
                {loading ? (
                    <div className="bg-slate-50/50 dark:bg-zinc-950/10 border border-slate-200 dark:border-zinc-900 rounded-2xl p-8 text-center shadow-inner my-4">
                        <Loader2 className="w-6 h-6 text-purple-500 animate-spin mx-auto mb-2" />
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                            Loading members...
                        </p>
                    </div>
                ) : members.length === 0 ? (
                    <div className="text-center py-10">
                        <p className="text-slate-500 dark:text-zinc-400">
                            No members found.
                        </p>
                    </div>
                ) : (
                    members.map((member) => (
                        <div
                            key={`${member.userEmail}-${id}`}
                            className="p-4 border border-slate-200 dark:border-zinc-800 rounded-xl"
                        >
                            <p className="font-medium text-slate-900 dark:text-zinc-100">{member.userEmail}</p>
                            <p className="text-sm text-slate-500 dark:text-zinc-400">Role: {member.role}</p>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">

                    <button
                        onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                        disabled={page === 1 || loading}
                        className="h-10 w-10 flex items-center justify-center rounded-lg border bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        aria-label="Previous page"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => (
                        <button
                            key={i}
                            disabled={loading}
                            onClick={() => setPage(i + 1)}
                            className={`
                                h-10 w-10 rounded-lg border font-medium transition-all
                                ${
                                    page === i + 1
                                        ? 'bg-purple-600 text-white border-purple-600'
                                        : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800'
                                }
                                disabled:opacity-50 disabled:cursor-not-allowed
                            `}
                        >
                            {i + 1}
                        </button>
                    ))}

                    <button
                        onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                        disabled={page === totalPages || loading}
                        className="h-10 w-10 flex items-center justify-center rounded-lg border bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        aria-label="Next page"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>

                </div>
            )}
        </div>
    );
}