import * as React from 'react';
import { cn } from '@/lib/utils';
import { Kbd, KbdGroup } from './kbd';

interface ShortcutBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The keyboard shortcut display string (e.g., 'Ctrl + K', 'Ctrl + Enter', 'Esc') */
  shortcut: string;
  /** Optional custom className */
  className?: string;
  /** Show in a more compact format */
  compact?: boolean;
}

/**
 * ShortcutBadge Component
 * Displays keyboard shortcuts in a visually consistent manner using semantic <kbd> tags
 *
 * @example
 * <ShortcutBadge shortcut="Ctrl + K" />
 * <ShortcutBadge shortcut="Ctrl + Enter" compact />
 * <ShortcutBadge shortcut="Esc" className="ml-auto" />
 */
const ShortcutBadge = React.forwardRef<HTMLDivElement, ShortcutBadgeProps>(
  ({ shortcut, className, compact = false, ...props }, ref) => {
    // Parse the shortcut string to extract individual keys
    const keys = shortcut
      .split('+')
      .map((key) => key.trim())
      .filter(Boolean);

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1',
          compact && 'gap-0.5',
          className
        )}
        {...props}
      >
        <KbdGroup>
          {keys.map((key, index) => (
            <React.Fragment key={`${key}-${index}`}>
              <Kbd className={compact ? 'px-1.5 py-0.5 text-xs' : ''}>
                {key}
              </Kbd>
              {index < keys.length - 1 && (
                <span className={cn(
                  'text-muted-foreground',
                  compact ? 'text-xs' : 'text-sm'
                )}>
                  +
                </span>
              )}
            </React.Fragment>
          ))}
        </KbdGroup>
      </div>
    );
  }
);

ShortcutBadge.displayName = 'ShortcutBadge';

export { ShortcutBadge };
export type { ShortcutBadgeProps };
