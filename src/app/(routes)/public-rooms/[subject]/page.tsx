"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { MessageSquare, Plus, Loader2 } from "lucide-react";
import AskDoubt from "@/components/classroom/AskDoubt";
import DoubtCard from "@/components/classroom/DoubtCard";
import DoubtSortSelect, { DoubtSortValue } from "@/components/classroom/DoubtSortSelect";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import useSWRInfinite from "swr/infinite";
import { useInView } from "react-intersection-observer";

const PAGE_SIZE = 20;

export default function PublicRoomPage() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const subject = params.subject as string;
  const [isAskModalOpen, setIsAskModalOpen] = useState(false);

  const sort = (searchParams.get("sort") as DoubtSortValue) || "newest";

  const fetcher = (url: string) => fetch(url).then(res => res.json());
  .catch(err => console.error(err))