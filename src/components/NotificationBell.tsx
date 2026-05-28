"use client"

import { useEffect, useState } from "react"
import { Bell, Check, Loader2 } from "lucide-react"
import useSWR from "swr"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"
import type { NotificationRecord } from "@/lib/notifications/realtime"

interface Notification extends NotificationRecord {
    createdAt: string;
}

const fetcher = async (url: string) => {
    const res = await fetch(url)
    const data = await res.json()

    if (!res.ok) {
        throw new Error(data?.error || "Failed to fetch notifications")
    }

    return data
}

export default function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false)
    const [hasPollingError, setHasPollingError] = useState(false)
    const router = useRouter()
    const { isLoaded, isSignedIn } = useAuth()
    const canLoadNotifications = isLoaded && isSignedIn

    const { data, error, mutate } = useSWR(canLoadNotifications ? '/api/notifications' : null, fetcher, {
        refreshInterval: hasPollingError ? 120000 : 30000,
        shouldRetryOnError: false,
        onError: () => setHasPollingError(true),
        onSuccess: () => setHasPollingError(false),
    })

    const unreadCount = data?.unreadCount || 0
    const notifications: Notification[] = data?.notifications || []
    const isLoading = canLoadNotifications && !data && !error

    useEffect(() => {
        if (!canLoadNotifications) {
            setHasPollingError(false)
            return
        }

        const source = new EventSource('/api/notifications/stream')
        let streamErrorCount = 0

        source.addEventListener('notification', (event) => {
            const payload = JSON.parse((event as MessageEvent).data) as Notification
            streamErrorCount = 0

            toast(payload.title, {
                description: payload.message,
                action: payload.link
                    ? {
                        label: "View",
                        onClick: () => router.push(payload.link as string),
                    }
                    : undefined,
            })

            mutate((currentData: any) => {
                if (!currentData) return currentData

                const alreadyExists = currentData.notifications.some((notification: Notification) => notification.id === payload.id)
                if (alreadyExists) {
                    return currentData
                }

                toast(payload.title, {
                    description: payload.message,
                    action: payload.link
                        ? {
                            label: "View",
                            onClick: () => router.push(payload.link as string),
                        }
                        : undefined,
                })

                return {
                    ...currentData,
                    unreadCount: (currentData.unreadCount || 0) + 1,
                    notifications: [payload, ...currentData.notifications],
                }
            }, false)
        })

        source.onopen = () => {
            streamErrorCount = 0
        }

        source.onerror = () => {
            streamErrorCount += 1

            if (streamErrorCount >= 3) {
                source.close()
            }
        }

        return () => {
            source.close()
        }
    }, [canLoadNotifications, mutate, router])

    const markAsRead = async (id: number) => {
        // Optimistic update
        mutate((currentData: any) => {
            if (!currentData) return currentData
            return {
                ...currentData,
                unreadCount: Math.max(0, currentData.unreadCount - 1),
                notifications: currentData.notifications.map((n: Notification) => 
                    n.id === id ? { ...n, isRead: true } : n
                )
            }
        }, false)

        try {
            await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notificationId: id })
            })
            // Re-validate to ensure sync
            mutate()
        } catch (error) {
            console.error("Failed to mark as read", error)
        }
    }

    const markAllAsRead = async () => {
        if (unreadCount === 0) return

        mutate((currentData: any) => {
            if (!currentData) return currentData
            return {
                ...currentData,
                unreadCount: 0,
                notifications: currentData.notifications.map((n: Notification) => ({ ...n, isRead: true }))
            }
        }, false)

        try {
            await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ markAllRead: true })
            })
            mutate()
        } catch (error) {
            console.error("Failed to mark all as read", error)
        }
    }

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="relative rounded-full hover:bg-accent transition-colors"
                >
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex min-w-5 h-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white ring-2 ring-background">
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0 shadow-lg border-border/60">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                    <h4 className="text-sm font-semibold">Notifications</h4>
                    {unreadCount > 0 && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={markAllAsRead}
                            className="h-auto px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                            <Check className="h-3 w-3 mr-1" />
                            Mark all as read
                        </Button>
                    )}
                </div>
                <ScrollArea className="h-[300px]">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-32 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin" />
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                            <Bell className="h-8 w-8 text-muted-foreground/30 mb-2" />
                            <p className="text-sm text-muted-foreground">No notifications yet</p>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {notifications.map((notification) => (
                                <div 
                                    key={notification.id}
                                    onClick={() => {
                                        if (!notification.isRead) {
                                            markAsRead(notification.id)
                                        }
                                    }}
                                    className={`relative flex flex-col gap-1 p-4 border-b border-border/20 last:border-0 hover:bg-accent/50 cursor-pointer transition-colors ${!notification.isRead ? 'bg-accent/20' : ''}`}
                                >
                                    {!notification.isRead && (
                                        <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500" />
                                    )}
                                    <div className="flex items-start justify-between gap-2 pl-2">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-sm font-medium leading-none">
                                                {notification.title}
                                            </span>
                                            <span className="text-xs text-muted-foreground line-clamp-2">
                                                {notification.message}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground mt-1">
                                                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                            </span>
                                        </div>
                                    </div>
                                    {notification.link && (
                                        <Link 
                                            href={notification.link} 
                                            className="absolute inset-0 z-10" 
                                            onClick={(e) => {
                                                if (!notification.isRead) {
                                                    markAsRead(notification.id)
                                                }
                                                setIsOpen(false)
                                            }}
                                        >
                                            <span className="sr-only">View Details</span>
                                        </Link>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    )
}
