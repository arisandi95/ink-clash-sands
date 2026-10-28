import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface BannerProps {
  children: ReactNode;
  tone?: 'info' | 'warning' | 'danger';
  icon?: ReactNode;
  className?: string;
}

export function Banner({ children, tone = 'info', icon, className }: BannerProps) {
  return (
    <div
      role="status"
      className={cn(
        'flex items-center gap-2 rounded-control border px-3 py-1.5 text-sm font-bold',
        tone === 'info' && 'border-blue/40 bg-blue/10 text-ink',
        tone === 'warning' && 'border-highlight bg-highlight/20 text-ink',
        tone === 'danger' && 'border-red/40 bg-red/10 text-ink',
        className
      )}
    >
      {icon}
      <span>{children}</span>
    </div>
  );
}
