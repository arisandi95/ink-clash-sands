import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface BoardFrameProps {
  children: ReactNode;
  className?: string;
  label?: string;
}

export function BoardFrame({ children, className, label }: BoardFrameProps) {
  return (
    <div className={cn('mx-auto w-full max-w-[960px]', className)}>
      <div className="rounded-board bg-frame p-2.5 shadow-board">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[3px] border border-line/60 bg-board">
          {children}
          {label ? (
            <span className="absolute left-2 top-2 rounded-control bg-board/90 px-2 py-0.5 text-[11px] font-bold text-on-board">
              {label}
            </span>
          ) : null}
        </div>
      </div>
      <div className="mx-auto mt-1 h-1.5 w-2/3 rounded-b-[4px] bg-frame/80" aria-hidden="true" />
    </div>
  );
}
