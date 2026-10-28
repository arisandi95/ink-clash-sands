import * as RadixTooltip from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export const TooltipProvider = RadixTooltip.Provider;

export interface TooltipProps {
  label: ReactNode;
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
}

export function Tooltip({ label, children, side = 'top', className }: TooltipProps) {
  return (
    <RadixTooltip.Root delayDuration={280}>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          sideOffset={6}
          className={cn(
            'z-50 max-w-[240px] rounded-control border border-line bg-panel-raised px-2.5 py-1.5 text-xs font-semibold text-ink shadow-raised',
            className
          )}
        >
          {label}
          <RadixTooltip.Arrow className="fill-line" />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}
