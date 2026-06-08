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
};

type SubscriberBucket = Set<NotificationSubscriber>;

const notificationSubscribers = new Map<string, SubscriberBucket>();
let totalSubscribers = 0;

const HEARTBEAT_INTERVAL_MS = 30_000;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

const encoder = new TextEncoder();

function formatEvent(eventName: string, data: unknown) {
    return `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
}

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

    startHeartbeat(); // start the heartbeat func

    controller.enqueue(
        subscriber.encoder.encode(formatEvent("connected", { userEmail })),
    );

    return () => removeSubscriber(userEmail, subscriber);
}

export function publishNotification(notification: NotificationRecord) {
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
