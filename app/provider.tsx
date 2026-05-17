"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type AppUser = {
    id: string;
    name: string;
    email: string;
    university?: string;
    year?: string;
    collegeEmail?: string;
    role?: string;
    onboarded?: boolean;
};

type UserContextType = {
    appUser: AppUser | null;
    setAppUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
    loading: boolean;
    refresh: () => Promise<void>;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

// change this if your route is different
const USER_ENDPOINT = "/api/user";

import SessionTracker from "@/components/auth/SessionTracker";
import { Toaster } from "@/components/ui/sonner";
import { useRouter, usePathname } from "next/navigation";
import { KeyboardShortcutsProvider } from "@/components/KeyboardShortcutsProvider";
import { CommandMenu } from "@/components/CommandMenu";
import { ThemeProvider, useTheme } from "next-themes";

function ThemedToaster() {
    const { resolvedTheme } = useTheme();

    return (
        <Toaster
            theme={resolvedTheme === "dark" ? "dark" : "light"}
            closeButton
            richColors
            duration={4000}
            position="top-right"
        />
    );
}

export function Provider({ children }: { children: React.ReactNode }) {
    const [appUser, setAppUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    async function refresh() {
        setLoading(true);
        try {
            const res = await fetch(USER_ENDPOINT, {
                method: "POST",
                headers: { "content-type": "application/json" },
            });

            const data = await res.json().catch(() => null);

            if (!res.ok) {
                setAppUser(null);
                return;
            }

            setAppUser(data as AppUser);
        } catch {
            setAppUser(null);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void refresh();
    }, []);

    useEffect(() => {
        if (!loading && appUser && !appUser.onboarded) {
            const publicPaths = ['/onboarding', '/sign-in', '/sign-up', '/', '/public-rooms'];
            const isPublic = publicPaths.some(path => pathname === path || pathname.startsWith('/public-rooms'));
            if (!isPublic) {
                router.push("/onboarding");
            }
        }
    }, [appUser, loading, pathname]);

    return (
        <UserContext.Provider value={{ appUser, setAppUser, loading, refresh }}>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="doubtdesk-theme">
                <KeyboardShortcutsProvider>
                    <SessionTracker />
                    {children}
                    <CommandMenu />
                    <ThemedToaster />
                </KeyboardShortcutsProvider>
            </ThemeProvider>
        </UserContext.Provider>
    );
}

export function useAppUser() {
    const ctx = useContext(UserContext);
    if (!ctx) throw new Error("useAppUser must be used inside UserProvider");
    return ctx;
}
