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

function formatEvent(eventName: string, data: unknown) {
    return `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
}

function removeSubscriber(userEmail: string, subscriber: NotificationSubscriber) {
    const bucket = notificationSubscribers.get(userEmail);
    if (!bucket) return;

    bucket.delete(subscriber);
    if (bucket.size === 0) {
        notificationSubscribers.delete(userEmail);
    }
}

export function subscribeToNotifications(
    userEmail: string,
    controller: ReadableStreamDefaultController<Uint8Array>
) {
    const subscriber: NotificationSubscriber = {
        controller,
        encoder: new TextEncoder(),
    };

    const bucket = notificationSubscribers.get(userEmail) ?? new Set<NotificationSubscriber>();
    bucket.add(subscriber);
    notificationSubscribers.set(userEmail, bucket);

    controller.enqueue(subscriber.encoder.encode(formatEvent("connected", { userEmail })));

    return () => removeSubscriber(userEmail, subscriber);
}

export function publishNotification(notification: NotificationRecord) {
    const bucket = notificationSubscribers.get(notification.userEmail);
    if (!bucket || bucket.size === 0) return;

    const encoder = new TextEncoder();
    const payload = encoder.encode(formatEvent("notification", notification));

    for (const subscriber of Array.from(bucket)) {
        try {
            subscriber.controller.enqueue(payload);
        } catch {
            removeSubscriber(notification.userEmail, subscriber);
        }
    }
}
