"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { Bell, Check, Loader2 } from "lucide-react"
import useSWR from "swr"
import Link from "next/link"
import { useRouter } from "next/navigation"
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

interface NotificationData {
    unreadCount: number;
    notifications: Notification[];
}

const NOTIFICATIONS_KEY = '/api/notifications'
const NOTIFICATION_LOAD_ERROR_MESSAGE = "Could not load notifications."
const NOTIFICATION_RETRY_BUTTON_LABEL = "Try again"

const fetcher = async (url: string) => {
    const res = await fetch(url)

    if (!res.ok) {
        throw new Error(`Failed to fetch notifications: ${res.status}`)
    }

    return res.json()
}

export default function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false)
    const [isPollingPaused, setIsPollingPaused] = useState(false)
    const router = useRouter()
    const { isLoaded, isSignedIn } = useAuth()
    const shouldFetchNotifications = isLoaded && isSignedIn && !isPollingPaused

    // Polling every 30 seconds for new notifications
    const { data, error, mutate } = useSWR<NotificationData>(
        NOTIFICATIONS_KEY,
        fetcher,
        {
            refreshInterval: 30000,
            shouldRetryOnError: false,
            isPaused: () => !shouldFetchNotifications,
            onError: () => setIsPollingPaused(true),
        }
    )

    useEffect(() => {
        setIsPollingPaused(false)
    }, [isSignedIn])

    useEffect(() => {
        if (!isLoaded || !isSignedIn) return

        const source = new EventSource('/api/notifications/stream')

        source.addEventListener('notification', (event) => {
            const payload = JSON.parse((event as MessageEvent).data) as Notification

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

                return {
                    ...currentData,
                    unreadCount: (currentData.unreadCount || 0) + 1,
                    notifications: [payload, ...currentData.notifications],
                }
            }, false)
        })

        source.onerror = () => {
            // Keep the browser's built-in retry behavior active.
        }

        return () => {
            source.close()
        }
    }, [isLoaded, isSignedIn, mutate, router])

    const retryFetch = () => {
        setIsPollingPaused(false)
        void mutate()
    }

    const updateNotification = async (body: Record<string, unknown>) => {
        const res = await fetch('/api/notifications', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })

        if (!res.ok) {
            throw new Error(`Failed to update notifications: ${res.status}`)
        }
    }

    const applyOptimisticRead = (notificationId?: number) => mutate((currentData: any) => {
        if (!currentData) return currentData

        return {
            ...currentData,
            unreadCount: notificationId ? Math.max(0, currentData.unreadCount - 1) : 0,
            notifications: currentData.notifications.map((n: Notification) =>
                !notificationId || n.id === notificationId ? { ...n, isRead: true } : n
            )
        }
    }, false)

    const syncNotifications = () => {
        if (!isSignedIn) return

        setIsPollingPaused(false)
        mutate()
    }

    if (!isLoaded || !isSignedIn) {
        return null
    }

    const isLoadError = Boolean(error)
    const unreadCount = data?.unreadCount || 0
    const notifications: Notification[] = data?.notifications || []
    const isLoading = shouldFetchNotifications && !data && !error

    const markAsRead = async (id: number) => {
        applyOptimisticRead(id)

        try {
            await updateNotification({ notificationId: id })
            syncNotifications()
        } catch (error) {
            console.error("Failed to mark as read", error)
            syncNotifications()
        }
    }

    const markAllAsRead = async () => {
        if (unreadCount === 0) return

        applyOptimisticRead()

        try {
            await updateNotification({ markAllRead: true })
            syncNotifications()
        } catch (error) {
            console.error("Failed to mark all as read", error)
            syncNotifications()
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
                         aria-label="Interactive button">
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
                    ) : isLoadError ? (
                        <div className="flex flex-col items-center justify-center h-32 text-center px-4 gap-3">
                            <p className="text-sm text-muted-foreground">{NOTIFICATION_LOAD_ERROR_MESSAGE}</p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={retryFetch}
                            >
                                {NOTIFICATION_RETRY_BUTTON_LABEL}
                            </Button>
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
