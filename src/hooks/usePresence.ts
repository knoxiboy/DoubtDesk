import { useState, useEffect, useCallback } from 'react';

export interface TypingUser {
  username: string;
  initial: string;
}

export function usePresence(doubtId: number | undefined, username: string | undefined, userInitial: string | undefined) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

  useEffect(() => {
    if (!doubtId) return;

    let eventSource: EventSource;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      eventSource = new EventSource(`/api/rooms/${doubtId}/presence`);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.typingUsers) {
            // Filter out self from the list
            setTypingUsers(data.typingUsers.filter((u: TypingUser) => u.username !== username));
          }
        } catch (err) {
          console.error("Error parsing presence data", err);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        reconnectTimeout = setTimeout(connect, 3000); // Try to reconnect
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [doubtId, username]);

  const setTyping = useCallback(async (isTyping: boolean) => {
    if (!doubtId || !username) return;
    try {
      await fetch(`/api/rooms/${doubtId}/presence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTyping, username, initial: userInitial }),
      });
    } catch (err) {
      console.error("Failed to set typing status", err);
    }
  }, [doubtId, username, userInitial]);

  return { typingUsers, setTyping };
}
