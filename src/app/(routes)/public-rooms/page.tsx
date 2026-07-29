"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Plus, SlidersHorizontal, Loader2, Bookmark } from "lucide-react";
import AskDoubt from "@/components/classroom/AskDoubt";
import DoubtCard from "@/components/classroom/DoubtCard";
import DoubtSortSelect, { DoubtSortValue } from "@/components/classroom/DoubtSortSelect";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import useSWRInfinite from "swr/infinite";
import { useInView } from "react-intersection-observer";
import ScrollToTopButton from "@/components/layout/ScrollToTopButton";
import { Doubt } from "@/types";
import { useUser } from "@clerk/nextjs";

const PAGE_SIZE = 20;

export default function PublicRoomsPage() {
    const { isSignedIn } = useUser();
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isAskModalOpen, setIsAskModalOpen] = useState(false);
    const [filter, setFilter] = useState("All");
    const [tagFilter, setTagFilter] = useState("");
    const [customFilter, setCustomFilter] = useState("");
    const [isOthersActive, setIsOthersActive] = useState(false);
    const [appliedCustomFilter, setAppliedCustomFilter] = useState("");
    const [appliedTagFilter, setAppliedTagFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState<'all' | 'unsolved' | 'in-progress' | 'solved'>('all');

    const [searchVal, setSearchVal] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [pendingDoubts, setPendingDoubts] = useState<any[]>([]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchQuery(searchVal);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchVal]);

    useEffect(() => {
        const loadPendingDoubts = async () => {
            try {
                const { getPendingDoubts } = await import("@/lib/offline/syncQueue");
                const pending = await getPendingDoubts();
                setPendingDoubts(pending);
            } catch (err) {
                console.error("Failed to load pending doubts:", err);
            }
        };

        loadPendingDoubts();

        window.addEventListener("sync-queue-updated", loadPendingDoubts);
        window.addEventListener("online", loadPendingDoubts);
        return () => {
            window.removeEventListener("sync-queue-updated", loadPendingDoubts);
            window.removeEventListener("online", loadPendingDoubts);
        };
    }, []);

    const sort = (searchParams.get("sort") as DoubtSortValue) || "newest";

    const fetcher = (url: string) => fetch(url).then(res => res.json());
    .catch(err => console.error(err))