import * as RadixPopover from '@radix-ui/react-popover';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export const Popover = RadixPopover.Root;
export const PopoverTrigger = RadixPopover.Trigger;
export const PopoverClose = RadixPopover.Close;

export interface PopoverContentProps {
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  className?: string;
}

export function PopoverContent({ children, side = 'top', align = 'center', className }: PopoverContentProps) {
  return (
    <RadixPopover.Portal>
      <RadixPopover.Content
        side={side}
        align={align}
        sideOffset={8}
        className={cn(
          'z-50 w-64 rounded-panel border border-line bg-panel-raised p-3 text-ink shadow-raised focus:outline-none',
          className
        )}
      >
        {children}
        <RadixPopover.Arrow className="fill-line" />
      </RadixPopover.Content>
    </RadixPopover.Portal>
  );
}
