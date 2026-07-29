import { renderHook, act, waitFor } from '@testing-library/react';
import { usePresence } from '../../hooks/usePresence';

describe('usePresence', () => {
  let mockEventSource: any;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    mockEventSource = {
      onmessage: null,
      onerror: null,
      close: jest.fn(),
    };

    (global as any).EventSource = jest.fn(() => mockEventSource);

    mockFetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
    );
    global.fetch = mockFetch as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('initializes EventSource correctly', () => {
    renderHook(() => usePresence(1, 'testuser', 'T'));

    expect(global.EventSource).toHaveBeenCalledWith('/api/rooms/1/presence');
  });

  it('updates typingUsers when a message is received, filtering out self', () => {
    const { result } = renderHook(() => usePresence(1, 'testuser', 'T'));

    act(() => {
      mockEventSource.onmessage({
        data: JSON.stringify({
          typingUsers: [
            { username: 'otheruser', initial: 'O' },
            { username: 'testuser', initial: 'T' },
          ],
        }),
      });
    });

    expect(result.current.typingUsers).toEqual([{ username: 'otheruser', initial: 'O' }]);
  });

  it('calls fetch when setTyping is invoked', async () => {
    const { result } = renderHook(() => usePresence(1, 'testuser', 'T'));

    act(() => {
      result.current.setTyping(true);
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/rooms/1/presence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isTyping: true, username: 'testuser', initial: 'T' }),
    });
  });

  it('closes EventSource on unmount', () => {
    const { unmount } = renderHook(() => usePresence(1, 'testuser', 'T'));

    unmount();

    expect(mockEventSource.close).toHaveBeenCalled();
  });
});
