"use client";

import { useEffect, useState } from "react";
import { useAppUser } from "@/app/provider";
import { 
    Plus, 
    Link as LinkIcon, 
    School, 
    Users, 
    ArrowRight, 
    Loader2, 
    Sparkles, 
    Calendar,
    ChevronRight,
    Home
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import RecommendedClassrooms from "@/components/classroom/RecommendedClassrooms";

interface Classroom {
    id: number;
    name: string;
    university: string;
    year: string;
    teacherEmail: string;
    inviteCode?: string;
    role?: string;
}

function RoomCardSkeleton() {
    return (
        <div className="bg-white dark:bg-zinc-950/30 border border-slate-200 dark:border-zinc-900 rounded-2xl p-6 md:p-8 space-y-6 animate-pulse">
            <Skeleton className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-zinc-900" />
            <div className="space-y-3">
                <Skeleton className="h-7 w-3/4 bg-slate-100 dark:bg-zinc-900" />
                <Skeleton className="h-4 w-1/2 bg-slate-100 dark:bg-zinc-900" />
            </div>
            <div className="pt-6 border-t border-slate-100 dark:border-zinc-900 flex items-center justify-between">
                <div className="flex gap-4">
                    <Skeleton className="h-4 w-16 bg-slate-100 dark:bg-zinc-900" />
                    <Skeleton className="h-4 w-20 bg-slate-100 dark:bg-zinc-900" />
                </div>
                <Skeleton className="w-10 h-10 rounded-full bg-slate-100 dark:bg-zinc-900" />
            </div>
        </div>
    );
}

export default function RoomsPage() {
    const { appUser } = useAppUser();
    const router = useRouter();
    const [rooms, setRooms] = useState<Classroom[]>([]);
    const [recommended, setRecommended] = useState<Classroom[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

    const [createData, setCreateData] = useState({ name: "", year: "1st Year" });
    const [joinCode, setJoinCode] = useState("");
    const [isActionLoading, setIsActionLoading] = useState(false);

    useEffect(() => {
        fetchRooms();
    }, []);

    const fetchRooms = async () => {
        try {
            const res = await fetch("/api/rooms");
            const data = await res.json();
            if (res.ok) {
                setRooms(data.joined || []);
                setRecommended(data.recommended || []);
            }
        } catch (err) {
            toast.error("Failed to load classrooms");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsActionLoading(true);
        try {
            const res = await fetch("/api/rooms", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(createData),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Classroom created successfully!", { id: "classroom-created" });
                setIsCreateModalOpen(false);
                setCreateData({ name: "", year: "1st Year" });
                fetchRooms();
            } else {
                toast.error(data.error || "Failed to create room", { id: "classroom-create-error" });
            }
        } catch (err) {
            toast.error("Network error while creating classroom", { id: "classroom-create-error" });
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleJoinRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsActionLoading(true);
        try {
            const res = await fetch("/api/rooms/join", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ inviteCode: joinCode }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(`Joined ${data.classroom.name}!`, { id: "classroom-joined" });
                setIsJoinModalOpen(false);
                setJoinCode("");
                fetchRooms();
            } else {
                toast.error(data.error || "Failed to join room", { id: "classroom-join-error" });
            }
        } catch (err) {
            toast.error("Network error while joining classroom", { id: "classroom-join-error" });
        } finally {
            setIsActionLoading(false);
        }
    };

    return (
        <div className="p-4 md:p-8 relative overflow-hidden text-slate-900 dark:text-zinc-100 bg-white dark:bg-black min-h-screen transition-colors duration-500">
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-500/10 dark:from-blue-500/5 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0" />
            <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-500/5 dark:bg-purple-500/[0.02] blur-[120px] rounded-full translate-x-1/3 translate-y-1/3 pointer-events-none z-0" />

            <div className="max-w-7xl mx-auto relative z-10 space-y-10">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-100 dark:border-zinc-900/60">
                    <div className="space-y-2">
                        <Link href="/" className="inline-flex items-center gap-2 text-slate-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-wider hover:text-slate-900 dark:hover:text-white transition-colors">
                            <Home className="w-3.5 h-3.5" /> Home
                        </Link>
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight">
                            Virtual Classrooms
                        </h1>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 w-full sm:w-auto">
                        {appUser?.role === 'teacher' || appUser?.role === 'admin' ? (
                            <button 
                                onClick={() => setIsCreateModalOpen(true)}
                                className="w-full sm:w-auto group flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold uppercase tracking-wider text-xs transition-all duration-300 shadow-lg shadow-blue-600/10 active:scale-[0.98]"
                            >
                                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" /> New Class
                            </button>
                        ) : (
                            <button 
                                onClick={() => setIsJoinModalOpen(true)}
                                className="w-full sm:w-auto group flex items-center justify-center gap-3 px-6 py-4 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800/60 rounded-xl font-bold uppercase tracking-wider text-xs transition-all duration-300"
                            >
                                <LinkIcon className="w-4 h-4" /> Join Code
                            </button>
                        )}
                    </div>
                </header>

                {loading ? (
                    <div className="space-y-6">
                        <Skeleton className="h-6 w-48 bg-slate-100 dark:bg-zinc-900" />
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3].map((i) => (
                                <RoomCardSkeleton key={i} />
                            ))}
                        </div>
                    </div>
                ) : rooms.length === 0 ? (
                    <div className="space-y-10">
                        <div className="bg-slate-50/50 dark:bg-zinc-950/20 border border-slate-200 dark:border-zinc-900 rounded-2xl p-10 text-center space-y-4 shadow-sm max-w-3xl mx-auto">
                            <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-sm">
                                <School className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">No Classrooms Detected</h2>
                            <p className="text-slate-500 dark:text-zinc-400 max-w-sm mx-auto text-xs font-medium leading-relaxed">
                                It seems you are not part of any academic environment yet. 
                                {appUser?.role === 'teacher' ? " Create your first classroom to get started." : " Ask your teacher for the invite code to join."}
                            </p>
                            <button 
                                onClick={() => appUser?.role === 'teacher' ? setIsCreateModalOpen(true) : setIsJoinModalOpen(true)}
                                className="text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider text-xs flex items-center gap-2 mx-auto hover:gap-3 transition-all duration-300"
                            >
                                {appUser?.role === 'teacher' ? "Launch Classroom" : "Enter Invitation Code"} <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>

                        {appUser?.role === 'student' && (
                            <div className="max-w-5xl mx-auto">
                                <RecommendedClassrooms onJoin={async (code) => {
                                    setJoinCode(code);
                                    setIsJoinModalOpen(true);
                                }} />
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-10">
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" /> My Academic Circles
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {rooms.map((room) => (
                                    <RoomCard key={room.id} room={room} isRecommended={false} />
                                ))}
                            </div>
                        </div>

                        {appUser?.role === 'student' && (
                            <div className="pt-8 border-t border-slate-100 dark:border-zinc-900">
                                <RecommendedClassrooms onJoin={async (code) => {
                                    setJoinCode(code);
                                    setIsJoinModalOpen(true);
                                }} />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* CREATE MODAL */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xl bg-white/60 dark:bg-black/60 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 w-full max-w-md rounded-2xl p-6 md:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-300 text-slate-900 dark:text-zinc-100">
                        <div className="space-y-1">
                            <h2 className="text-2xl font-bold tracking-tight">Spawn Classroom</h2>
                            <p className="text-slate-500 dark:text-zinc-400 text-xs font-medium">Define your new academic workspace.</p>
                        </div>

                        <form onSubmit={handleCreateRoom} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 px-1">Classroom Name</label>
                                <input 
                                    type="text" 
                                    required 
                                    value={createData.name}
                                    onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
                                    placeholder="e.g. Advanced Calculus Section A"
                                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 rounded-xl focus:outline-none focus:border-blue-500/50 transition-all font-medium text-sm" 
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 px-1">Target Year</label>
                                <select 
                                    value={createData.year}
                                    onChange={(e) => setCreateData({ ...createData, year: e.target.value })}
                                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 rounded-xl focus:outline-none focus:border-blue-500/50 transition-all font-medium appearance-none cursor-pointer text-sm"
                                >
                                    <option className="bg-white dark:bg-zinc-900" value="1st Year">1st Year</option>
                                    <option className="bg-white dark:bg-zinc-900" value="2nd Year">2nd Year</option>
                                    <option className="bg-white dark:bg-zinc-900" value="3rd Year">3rd Year</option>
                                    <option className="bg-white dark:bg-zinc-900" value="Final Year">Final Year</option>
                                </select>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button 
                                    type="button" 
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="flex-1 py-3.5 rounded-xl font-bold uppercase tracking-wider text-xs text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors border border-transparent"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isActionLoading}
                                    className="flex-[2] py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold uppercase tracking-wider text-xs shadow-lg shadow-blue-600/10 flex items-center justify-center gap-2 transition-all"
                                 aria-label="Submit">
                                    {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Initiate room"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* JOIN MODAL */}
            {isJoinModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xl bg-white/60 dark:bg-black/60 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 w-full max-w-md rounded-2xl p-6 md:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-300 text-slate-900 dark:text-zinc-100">
                        <div className="space-y-1">
                            <h2 className="text-2xl font-bold tracking-tight">Enter Class</h2>
                            <p className="text-slate-500 dark:text-zinc-400 text-xs font-medium">Input your unique invitation code.</p>
                        </div>

                        <form onSubmit={handleJoinRoom} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 px-1">Invitation Code</label>
                                <input 
                                    type="text" 
                                    required 
                                    maxLength={8}
                                    value={joinCode}
                                    onChange={(e) => setJoinCode(e.target.value)}
                                    placeholder="XXXXXX"
                                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 rounded-xl focus:outline-none focus:border-blue-500/50 transition-all font-black text-center text-2xl tracking-[0.3em] uppercase placeholder:text-slate-300 dark:placeholder:text-zinc-700 text-slate-900 dark:text-white" 
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button 
                                    type="button" 
                                    onClick={() => setIsJoinModalOpen(false)}
                                    className="flex-1 py-3.5 rounded-xl font-bold uppercase tracking-wider text-xs text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors border border-transparent"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isActionLoading}
                                    className="flex-[2] py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold uppercase tracking-wider text-xs shadow-lg shadow-blue-600/10 flex items-center justify-center gap-2 transition-all"
                                 aria-label="Submit">
                                    {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Access Circle"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function RoomCard({ room, isRecommended, onDiscover }: { room: Classroom; isRecommended?: boolean; onDiscover?: () => void }) {
    if (isRecommended) {
        return (
            <div 
                onClick={onDiscover}
                className="group block bg-white/50 dark:bg-zinc-950/30 border border-slate-200 dark:border-zinc-900 rounded-2xl p-6 backdrop-blur-md flex flex-col justify-between hover:-translate-y-1 transition-all duration-300 shadow-xl shadow-slate-200/5 dark:shadow-none cursor-pointer"
            >
                <div className="absolute top-6 right-6 px-2.5 py-1 rounded-md bg-purple-500/10 border border-purple-500/20 text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                    Discover
                </div>

                <div className="space-y-6 w-full">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-xl flex items-center justify-center text-xl font-black shadow-md shadow-blue-500/10">
                        {room.name.charAt(0).toUpperCase()}
                    </div>
                    
                    <div className="space-y-1">
                        <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300">
                            {room.name}
                        </h3>
                        <p className="text-slate-400 dark:text-zinc-500 text-xs font-semibold flex items-center gap-1.5">
                            <School className="w-3.5 h-3.5" /> {room.university}
                        </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-zinc-900 flex items-center justify-between">
                        <div className="flex items-center gap-3 text-slate-400 dark:text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {room.year}</span>
                        </div>
                        <div className="text-purple-600 dark:text-purple-400 text-[10px] font-bold uppercase tracking-wider group-hover:translate-x-1 transition-transform duration-300">
                            Join Now
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <Link 
            href={`/rooms/${room.id}`} 
            className="group block bg-white/50 dark:bg-zinc-950/30 border border-slate-200 dark:border-zinc-900 rounded-2xl p-6 backdrop-blur-md flex flex-col justify-between hover:-translate-y-1 transition-all duration-300 shadow-xl shadow-slate-200/5 dark:shadow-none"
        >
            <div className="absolute top-6 right-6 px-2.5 py-1 rounded-md bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 group-hover:bg-blue-600 group-hover:border-blue-500 group-hover:text-white transition-all duration-300">
                {room.role}
            </div>

            <div className="space-y-6 w-full">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-xl flex items-center justify-center text-xl font-black shadow-md shadow-blue-500/10">
                    {room.name.charAt(0).toUpperCase()}
                </div>
                
                <div className="space-y-1">
                    <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                        {room.name}
                    </h3>
                    <p className="text-slate-400 dark:text-zinc-500 text-xs font-semibold flex items-center gap-1.5">
                        <School className="w-3.5 h-3.5" /> {room.university}
                    </p>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-zinc-900 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-slate-400 dark:text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {room.year}</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-center group-hover:bg-blue-600 group-hover:border-blue-500 transition-all duration-300 shadow-sm">
                        <ChevronRight className="w-4 h-4 text-slate-400 dark:text-zinc-500 group-hover:text-white" />
                    </div>
                </div>
            </div>
        </Link>
    );
}