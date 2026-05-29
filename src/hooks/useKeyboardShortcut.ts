import { useEffect, useCallback } from 'react';

interface KeyboardShortcutOptions {
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  key: string;
  onTrigger: () => void;
  enabled?: boolean;
}

/**
 * Custom hook for handling keyboard shortcuts
 * Prevents triggering shortcuts when user is typing in input fields, textareas, or contenteditable elements
 * Exception: Escape key always works for closing dialogs
 *
 * @param options - Shortcut configuration
 * @returns void
 *
 * @example
 * useKeyboardShortcut({
 *   key: 'k',
 *   ctrl: true,
 *   onTrigger: () => setSearchOpen(true),
 *   enabled: true
 * });
 */
export function useKeyboardShortcut({
  ctrl = false,
  shift = false,
  alt = false,
  meta = false,
  key,
  onTrigger,
  enabled = true,
}: KeyboardShortcutOptions): void {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Check if the key combination matches
      const matchesModifiers =
        event.ctrlKey === ctrl &&
        event.shiftKey === shift &&
        event.altKey === alt &&
        event.metaKey === meta;

      // Normalize key comparison (case-insensitive for letters)
      const keyMatches = event.key.toLowerCase() === key.toLowerCase();

      if (!matchesModifiers || !keyMatches) return;

      // Get the currently focused element
      const target = event.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      const isContentEditable =
        target.getAttribute('contenteditable') === 'true' ||
        target.getAttribute('contenteditable') === '';

      // Allow Escape key to work everywhere (for closing modals/dialogs)
      if (key.toLowerCase() === 'escape') {
        event.preventDefault();
        onTrigger();
        return;
      }

      // Prevent shortcuts from triggering while typing in input fields, textareas, or contenteditable elements
      if (
        tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'select' ||
        isContentEditable
      ) {
        return;
      }

      event.preventDefault();
      onTrigger();
    },
    [ctrl, shift, alt, meta, key, onTrigger, enabled]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}

/**
 * Predefined shortcuts for common actions
 */
export const COMMON_SHORTCUTS = {
  SEARCH: {
    key: 'k',
    ctrl: true,
    label: 'Search',
    display: 'Ctrl + K',
  },
  SUBMIT: {
    key: 'Enter',
    ctrl: true,
    label: 'Submit',
    display: 'Ctrl + Enter',
  },
  CLOSE: {
    key: 'Escape',
    label: 'Close',
    display: 'Esc',
  },
} as const;
