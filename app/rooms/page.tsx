"use client";

import { useEffect, useState } from "react";
import { useAppUser } from "../provider";
import { 
    Plus, 
    Link as LinkIcon, 
    School, 
    Users, 
    ArrowRight, 
    GraduationCap, 
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
        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-6">
            <Skeleton className="w-14 h-14 rounded-2xl" />
            <div className="space-y-3">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
            </div>
            <div className="pt-6 border-t border-white/10 flex items-center justify-between">
                <div className="flex gap-4">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="w-10 h-10 rounded-full" />
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
        <div className="p-4 md:p-8 relative overflow-hidden">
            {/* Background Orbs */}
            <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-blue-600/5 blur-[150px] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            
            <div className="max-w-7xl mx-auto relative z-10">
                {/* Header Section */}
                <div className="sticky top-0 z-50 bg-[#020617]/80 backdrop-blur-xl -mx-4 md:-mx-8 px-4 md:px-8 py-5 mb-8 border-b border-white/5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Link href="/" className="inline-flex items-center gap-2 text-slate-400 text-xs font-black uppercase tracking-widest hover:text-white underline underline-offset-4 transition-all">
                                    <Home className="w-3.5 h-3.5" /> Home
                                </Link>
                            </div>
                            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter uppercase italic break-words">
                                Virtual <span className="text-blue-500">Classrooms</span>
                            </h1>
                        </div>

                        <div className="flex items-center gap-4">
                            {appUser?.role === 'teacher' || appUser?.role === 'admin' ? (
                                <button 
                                    onClick={() => setIsCreateModalOpen(true)}
                                    className="group flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 active:scale-[0.98]"
                                >
                                    <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" /> New Class
                                </button>
                            ) : (
                                <button 
                                    onClick={() => setIsJoinModalOpen(true)}
                                    className="group flex items-center gap-3 px-8 py-4 bg-white/5 border border-white/10 hover:bg-white/10 rounded-2xl font-black uppercase tracking-widest transition-all active:scale-[0.98]"
                                >
                                    <LinkIcon className="w-5 h-5" /> Join Code
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="space-y-6">
                        <Skeleton className="h-8 w-64" />
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <RoomCardSkeleton key={i} />
                            ))}
                        </div>
                    </div>
                ) : rooms.length === 0 ? (
                    <div className="bg-white/5 border border-white/10 rounded-[3rem] p-10 text-center space-y-4">
                        <div className="w-20 h-20 bg-blue-500/10 border border-blue-500/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
                            <School className="w-10 h-10 text-blue-500" />
                        </div>
                        <h2 className="text-3xl font-black uppercase tracking-tight italic">No Classrooms Detected</h2>
                        <p className="text-slate-500 max-w-md mx-auto font-medium">
                            It seems you're not part of any academic environment yet. 
                            {appUser?.role === 'teacher' ? " Create your first classroom to get started." : " Ask your teacher for the invite code to join."}
                        </p>
                        <button 
                            onClick={() => appUser?.role === 'teacher' ? setIsCreateModalOpen(true) : setIsJoinModalOpen(true)}
                            className="text-blue-500 font-black uppercase tracking-widest flex items-center gap-2 mx-auto hover:gap-4 transition-all"
                        >
                            {appUser?.role === 'teacher' ? "Launch Classroom" : "Enter Invitation Code"} <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                ) : (
                    <div className="space-y-10">
                        {/* MY ROOMS */}
                        <div className="space-y-6">
                            <h2 className="text-2xl font-black uppercase tracking-tight italic flex items-center gap-3">
                                <Users className="w-6 h-6 text-blue-500" /> My Academic Circles
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {rooms.map((room) => (
                                    <RoomCard key={room.id} room={room} isRecommended={false} />
                                ))}
                            </div>
                        </div>

                        {/* RECOMMENDED ROOMS */}
                        {recommended.length > 0 && (
                            <div className="space-y-6 pt-6 border-t border-white/5">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-black uppercase tracking-tight italic flex items-center gap-3">
                                        <Sparkles className="w-6 h-6 text-cyan-400" /> Recommended for {appUser?.year} at {appUser?.university}
                                    </h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {recommended.map((room) => (
                                        <RoomCard key={room.id} room={room} isRecommended={true} onDiscover={() => {
                                        setIsJoinModalOpen(true);
                                    }} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* CREATE MODAL */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-xl bg-[#020617]/80 animate-in fade-in duration-300">
                    <div className="bg-[#0f172a] border border-white/10 w-full max-w-lg rounded-[3rem] p-10 shadow-2xl space-y-8 animate-in zoom-in-95 duration-300">
                        <div className="space-y-2">
                            <h2 className="text-4xl font-black italic uppercase tracking-tighter">Spawn <span className="text-blue-500">Classroom</span></h2>
                            <p className="text-slate-400 font-medium">Define your new academic workspace.</p>
                        </div>

                        <form onSubmit={handleCreateRoom} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Classroom Name</label>
                                <input 
                                    type="text" 
                                    required 
                                    value={createData.name}
                                    onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
                                    placeholder="e.g. Advanced Calculus Section A"
                                    className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl focus:outline-none focus:border-blue-500 transition-all font-medium" 
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Target Year</label>
                                <select 
                                    value={createData.year}
                                    onChange={(e) => setCreateData({ ...createData, year: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl focus:outline-none focus:border-blue-500 transition-all font-medium appearance-none"
                                >
                                    <option className="bg-[#0f172a]" value="1st Year">1st Year</option>
                                    <option className="bg-[#0f172a]" value="2nd Year">2nd Year</option>
                                    <option className="bg-[#0f172a]" value="3rd Year">3rd Year</option>
                                    <option className="bg-[#0f172a]" value="Final Year">Final Year</option>
                                </select>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button 
                                    type="button" 
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="flex-1 py-5 rounded-3xl font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isActionLoading}
                                    className="flex-[2] py-5 bg-blue-600 rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2"
                                >
                                    {isActionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Initiate room"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* JOIN MODAL */}
            {isJoinModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-xl bg-[#020617]/80 animate-in fade-in duration-300">
                    <div className="bg-[#0f172a] border border-white/10 w-full max-w-lg rounded-[3rem] p-10 shadow-2xl space-y-8 animate-in zoom-in-95 duration-300">
                        <div className="space-y-2">
                            <h2 className="text-4xl font-black italic uppercase tracking-tighter">Enter <span className="text-blue-500">Class</span></h2>
                            <p className="text-slate-400 font-medium">Input your unique invitation code.</p>
                        </div>

                        <form onSubmit={handleJoinRoom} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Invitation Code</label>
                                <input 
                                    type="text" 
                                    required 
                                    maxLength={8}
                                    value={joinCode}
                                    onChange={(e) => setJoinCode(e.target.value)}
                                    placeholder="XXXXXX"
                                    className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl focus:outline-none focus:border-blue-500 transition-all font-black text-center text-3xl tracking-[0.5em] uppercase placeholder:text-slate-700" 
                                />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button 
                                    type="button" 
                                    onClick={() => setIsJoinModalOpen(false)}
                                    className="flex-1 py-5 rounded-3xl font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isActionLoading}
                                    className="flex-[2] py-5 bg-blue-600 rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2"
                                >
                                    {isActionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Access Circle"}
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
                className="group block bg-white/5 border border-white/10 rounded-[2.5rem] p-8 hover:bg-white/10 transition-all duration-500 relative overflow-hidden cursor-pointer"
            >
                {/* Role Badge */}
                <div className="absolute top-6 right-6 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-black uppercase tracking-widest text-cyan-400">
                    Discover
                </div>

                <div className="space-y-6">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-2xl font-black tracking-tighter shadow-lg shadow-blue-500/10">
                        {room.name.charAt(0).toUpperCase()}
                    </div>
                    
                    <div>
                        <h3 className="text-2xl font-black uppercase tracking-tight italic mb-1 group-hover:text-blue-500 transition-colors">
                            {room.name}
                        </h3>
                        <p className="text-slate-500 text-sm font-bold flex items-center gap-2">
                            <School className="w-3.5 h-3.5" /> {room.university}
                        </p>
                    </div>

                    <div className="pt-6 border-t border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-4 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {room.year}</span>
                            <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Community</span>
                        </div>
                        <div className="text-cyan-400 text-[10px] font-black uppercase tracking-widest group-hover:translate-x-1 transition-transform">
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
            className="group block bg-white/5 border border-white/10 rounded-[2.5rem] p-8 hover:bg-white/10 transition-all duration-500 relative overflow-hidden"
        >
            {/* Role Badge */}
            <div className="absolute top-6 right-6 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:bg-blue-600 group-hover:border-blue-500 group-hover:text-white transition-all">
                {room.role}
            </div>

            <div className="space-y-6">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-2xl font-black tracking-tighter shadow-lg shadow-blue-500/10">
                    {room.name.charAt(0).toUpperCase()}
                </div>
                
                <div>
                    <h3 className="text-2xl font-black uppercase tracking-tight italic mb-1 group-hover:text-blue-500 transition-colors">
                        {room.name}
                    </h3>
                    <p className="text-slate-500 text-sm font-bold flex items-center gap-2">
                        <School className="w-3.5 h-3.5" /> {room.university}
                    </p>
                </div>

                <div className="pt-6 border-t border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                        <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {room.year}</span>
                        <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Community</span>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-blue-600 transition-all shadow-inner">
                        <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-white" />
                    </div>
                </div>
            </div>
        </Link>
    );
}
