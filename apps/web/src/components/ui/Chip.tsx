import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface ChipProps {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  icon?: ReactNode;
  disabled?: boolean;
  className?: string;
  title?: string;
}

export function Chip({ children, selected, onClick, icon, disabled, className, title }: ChipProps) {
  const Element = onClick ? 'button' : 'span';
  return (
    <Element
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      disabled={onClick ? disabled : undefined}
      aria-pressed={onClick ? selected : undefined}
      title={title}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-panel-raised px-3 text-sm font-bold text-ink-soft transition-colors duration-150',
        onClick && 'hover:text-ink',
        selected && 'border-ink bg-highlight text-on-highlight',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      {icon}
      {children}
    </Element>
  );
}
