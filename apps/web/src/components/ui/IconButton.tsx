import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Tooltip } from './Tooltip';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  shortcut?: string;
  icon: ReactNode;
  active?: boolean;
  tone?: 'default' | 'blue' | 'red';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, shortcut, icon, active = false, tone = 'default', className, ...props },
  ref
) {
  return (
    <Tooltip label={shortcut ? `${label} (${shortcut})` : label}>
      <button
        ref={ref}
        type="button"
        aria-label={label}
        aria-pressed={active}
        className={cn(
          'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-line bg-panel-raised text-ink transition-colors duration-150 hover:bg-panel active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-40',
          active && 'border-ink bg-highlight text-on-highlight',
          tone === 'blue' && active && 'border-blue bg-blue text-on-accent',
          tone === 'red' && 'hover:text-red',
          className
        )}
        {...props}
      >
        {icon}
      </button>
    </Tooltip>
  );
});
