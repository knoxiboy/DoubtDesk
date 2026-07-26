import { Redis } from "@upstash/redis";

export type NotificationRecord = {
    id: number;
    userEmail: string;
    title: string;
    message: string;
    link: string | null;
    type: string;
    isRead: boolean;
    createdAt: Date | string;
};

type NotificationSubscriber = {
    controller: ReadableStreamDefaultController<Uint8Array>;
    encoder: TextEncoder;
    redisUnsubscribe?: () => Promise<void>;
};

type SubscriberBucket = Set<NotificationSubscriber>;

const notificationSubscribers = new Map<string, SubscriberBucket>();
let totalSubscribers = 0;

const HEARTBEAT_INTERVAL_MS = 30_000;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

const encoder = new TextEncoder();

// ── Redis Pub/Sub (cross-instance notification delivery) ──────────────────

let redisClient: Redis | null | undefined = undefined;
let redisWarningLogged = false;

const REDIS_CHANNEL_PREFIX = "notifications:";

interface RedisSubscriber<T> {
    on(event: string, listener: (data: unknown) => void): void;
    unsubscribe(channels?: string[]): Promise<void>;
}

type RedisSubscriptionState = {
    subscriber: RedisSubscriber<NotificationRecord>;
    refCount: number;
};

const redisSubscriptions = new Map<string, RedisSubscriptionState>();

function getRedisChannel(userEmail: string): string {
    return `${REDIS_CHANNEL_PREFIX}${userEmail}`;
}

function ensureRedisClient(): Redis | null {
    if (redisClient !== undefined) return redisClient;

    try {
        if (
            typeof process === "object" &&
            process.env?.UPSTASH_REDIS_REST_URL &&
            process.env?.UPSTASH_REDIS_REST_TOKEN
        ) {
            redisClient = Redis.fromEnv();
        } else {
            if (!redisWarningLogged) {
                console.warn(
                    "\x1b[33m%s\x1b[0m",
                    `⚠️  WARNING: Upstash Redis is not configured.
    Real-time notifications will only work within a single server instance.
    Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for cross-instance delivery.`,
                );
                redisWarningLogged = true;
            }
            redisClient = null;
        }
    } catch {
        redisClient = null;
    }

    return redisClient;
}

async function subscribeToRedisChannel(
    userEmail: string,
): Promise<() => Promise<void>> {
    const client = ensureRedisClient();
    if (!client) return async () => {};

    const existing = redisSubscriptions.get(userEmail);
    if (existing) {
        existing.refCount++;
        const unsub = existing.subscriber.unsubscribe.bind(
            existing.subscriber,
        );
        return async () => {
            existing.refCount--;
            if (existing.refCount <= 0) {
                redisSubscriptions.delete(userEmail);
                try {
                    await unsub();
                } catch {
                    // Ignore unsubscribe errors
                }
            }
        };
    }

    try {
        const channel = getRedisChannel(userEmail);
        const subscriber = client.subscribe<NotificationRecord>(channel);

        subscriber.on("message", ({ message: notification }) => {
            const bucket = notificationSubscribers.get(userEmail);
            if (!bucket || bucket.size === 0) return;

            const payload = encoder.encode(
                formatEvent("notification", notification),
            );

            for (const sub of Array.from(bucket)) {
                try {
                    sub.controller.enqueue(payload);
                } catch {
                    removeSubscriber(userEmail, sub);
                }
            }
        });

        subscriber.on("error", () => {
            // Subscriber will attempt to reconnect automatically.
        });

        const state: RedisSubscriptionState = { subscriber, refCount: 1 };
        redisSubscriptions.set(userEmail, state);

        const unsub = subscriber.unsubscribe.bind(subscriber);
        return async () => {
            state.refCount--;
            if (state.refCount <= 0) {
                redisSubscriptions.delete(userEmail);
                try {
                    await unsub();
                } catch {
                    // Ignore
                }
            }
        };
    } catch {
        return async () => {};
    }
}

// ── Event formatting ─────────────────────────────────────────────────────

function formatEvent(eventName: string, data: unknown) {
    return `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
}

// ── Heartbeat ────────────────────────────────────────────────────────────

function startHeartbeat() {
    if (heartbeatInterval) return;

    heartbeatInterval = setInterval(() => {
        const payload = encoder.encode(": heartbeat\n\n");

        for (const [userEmail, bucket] of notificationSubscribers.entries()) {
            for (const subscriber of Array.from(bucket)) {
                try {
                    subscriber.controller.enqueue(payload);
                } catch {
                    removeSubscriber(userEmail, subscriber);
                }
            }
        }
    }, HEARTBEAT_INTERVAL_MS);
}

function stopHeartbeat() {
    if (!heartbeatInterval) return;

    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
}

function removeSubscriber(
    userEmail: string,
    subscriber: NotificationSubscriber,
) {
    if (subscriber.redisUnsubscribe) {
        subscriber.redisUnsubscribe().catch(() => {});
        subscriber.redisUnsubscribe = undefined;
    }

    const bucket = notificationSubscribers.get(userEmail);
    if (!bucket) return;

    if (bucket.delete(subscriber)) {
        totalSubscribers--;
    }
    if (bucket.size === 0) {
        notificationSubscribers.delete(userEmail);
    }
    if (totalSubscribers === 0) {
        stopHeartbeat();
    }
}

export function subscribeToNotifications(
    userEmail: string,
    controller: ReadableStreamDefaultController<Uint8Array>,
) {
    const subscriber: NotificationSubscriber = {
        controller,
        encoder: encoder,
    };

    const bucket =
        notificationSubscribers.get(userEmail) ?? new Set<NotificationSubscriber>();
    bucket.add(subscriber);
    notificationSubscribers.set(userEmail, bucket);

    totalSubscribers++;

    startHeartbeat();

    controller.enqueue(
        subscriber.encoder.encode(formatEvent("connected", { userEmail })),
    );

    subscribeToRedisChannel(userEmail).then((unsub) => {
        subscriber.redisUnsubscribe = unsub;
    });

    return () => removeSubscriber(userEmail, subscriber);
}

export function publishNotification(notification: NotificationRecord) {
    const client = ensureRedisClient();
    if (client) {
        void client
            .publish(
                getRedisChannel(notification.userEmail),
                JSON.stringify(notification),
            )
            .catch(() => {
                // Redis publish failed; local subscribers still receive the notification
            });
    }

    const bucket = notificationSubscribers.get(notification.userEmail);
    if (!bucket || bucket.size === 0) return;

    const payload = encoder.encode(
        formatEvent("notification", notification),
    );

    for (const subscriber of Array.from(bucket)) {
        try {
            subscriber.controller.enqueue(payload);
        } catch {
            removeSubscriber(notification.userEmail, subscriber);
        }
    }
}