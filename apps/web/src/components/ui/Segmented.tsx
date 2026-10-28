import * as ToggleGroup from '@radix-ui/react-toggle-group';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  label: string;
  className?: string;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  disabled,
  label,
  className
}: SegmentedProps<T>) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(next) => {
        if (next) {
          onChange(next as T);
        }
      }}
      disabled={disabled}
      aria-label={label}
      className={cn('inline-flex w-full flex-wrap gap-1 rounded-control border border-line bg-panel p-1', className)}
    >
      {options.map((option) => (
        <ToggleGroup.Item
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          className={cn(
            'inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[7px] px-2.5 text-sm font-bold text-ink-soft transition-colors duration-150 hover:text-ink data-[state=on]:border data-[state=on]:border-ink data-[state=on]:bg-highlight data-[state=on]:text-on-highlight disabled:cursor-not-allowed disabled:opacity-40'
          )}
        >
          {option.icon}
          {option.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
