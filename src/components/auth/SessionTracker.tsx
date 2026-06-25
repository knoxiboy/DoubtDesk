"use client";

import { useEffect, useRef } from "react";
import { useClerk } from "@clerk/nextjs";

export default function SessionTracker() {
    const { signOut, user } = useClerk();
    const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const STORAGE_KEY = "mentorix_last_activity";

    // Dedicated logout broadcast key
    const LOGOUT_EVENT_KEY = "mentorix_logout";

    // Prevent concurrent logout race conditions
    const logoutInProgressRef = useRef(false);

    // Clears session activity data
    const clearSessionState = () => {
        localStorage.removeItem(STORAGE_KEY);
    };

    // Handles logout with concurrency and error protection
    const performLogout = async () => {
        if (logoutInProgressRef.current) {
            return false;
        }

        logoutInProgressRef.current = true;

        try {
            await signOut();
            clearSessionState();
            return true;
        } 
        catch (error) {
            console.error("[SessionTracker] Failed to sign out.", error);
            logoutInProgressRef.current = false;
            return false;
        }
    };

    // Signs out the current tab and broadcasts logout to other tabs
    const broadcastLogout = async () => {

        const didLogout = await performLogout();

        if (!didLogout) {
            return;
        }

        try {
            localStorage.setItem(LOGOUT_EVENT_KEY, Date.now().toString());
        } 
        catch (error) {
            console.error("[SessionTracker] Failed to publish logout broadcast.", error);
        }
    };

    useEffect(() => {
        if (!user) return;

        const checkSession = async () => {
            const lastActivity = localStorage.getItem(STORAGE_KEY);
            const now = Date.now();

            if (lastActivity) {
                const elapsed = now - parseInt(lastActivity);
                if (elapsed > SESSION_DURATION) {
                    console.log("[SessionTracker] Session expired. Signing out...");
                    await broadcastLogout();
                    return;
                }
            }

            // Update activity timestamp if session is valid or just started
            localStorage.setItem(STORAGE_KEY, now.toString());
        };

        void checkSession();

        // Optional: Update timestamp on visibility change to keep session alive during active browsing
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                localStorage.setItem(STORAGE_KEY, Date.now().toString());
            }
        };

        // Listen for logout broadcasts from other tabs
        const handleStorageEvent = async (event: StorageEvent) => {
            if (event.key !== LOGOUT_EVENT_KEY) {
                return;
            }

            await performLogout();
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("storage", handleStorageEvent);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("storage", handleStorageEvent);
        }
    }, [user, signOut]);

    return null;
}
