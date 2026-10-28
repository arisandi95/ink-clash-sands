import type { CSSProperties, ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { rotationFor } from '../../lib/hash';

export interface StickyNoteProps {
  children: ReactNode;
  seed?: string;
  tone?: 'yellow' | 'green' | 'plain';
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  selected?: boolean;
  ariaLabel?: string;
}

const tones = {
  yellow: 'bg-highlight text-on-highlight',
  green: 'bg-green text-on-accent',
  plain: 'bg-panel-raised text-ink'
};

export function StickyNote({
  children,
  seed = 'note',
  tone = 'yellow',
  className,
  onClick,
  disabled,
  selected,
  ariaLabel
}: StickyNoteProps) {
  const rotate = rotationFor(seed);
  const style = { '--note-rotate': `${rotate}deg`, transform: `rotate(${rotate}deg)` } as CSSProperties;
  const Element = onClick ? 'button' : 'div';
  return (
    <Element
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      disabled={onClick ? disabled : undefined}
      aria-label={ariaLabel}
      aria-pressed={onClick ? selected : undefined}
      style={style}
      className={cn(
        'relative block rounded-note p-3 text-left shadow-note transition-transform duration-150 ease-pop',
        tones[tone],
        onClick && !disabled && 'hover:-translate-y-0.5 hover:rotate-0',
        selected && 'outline outline-2 outline-offset-2 outline-ink',
        disabled && 'cursor-not-allowed opacity-60',
        className
      )}
    >
      {children}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-0 h-3.5 w-3.5 bg-black/10"
        style={{ clipPath: 'polygon(0 100%, 100% 0, 100% 100%)' }}
      />
    </Element>
  );
}
