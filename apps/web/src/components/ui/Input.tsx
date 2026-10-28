import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
  hint?: ReactNode;
  showCount?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, showCount, className, id, maxLength, value, ...props },
  ref
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const length = typeof value === 'string' ? value.length : 0;

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label ? (
        <label htmlFor={inputId} className="text-sm font-extrabold text-ink">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          value={value}
          maxLength={maxLength}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={cn(
            'h-11 w-full rounded-control border border-line bg-panel-raised px-3 text-[15px] font-semibold text-ink placeholder:font-medium placeholder:text-ink-soft/70 focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/30',
            error && 'border-red focus:border-red focus:ring-red/30',
            className
          )}
          {...props}
        />
        {showCount && maxLength ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-soft tabular">
            {length}/{maxLength}
          </span>
        ) : null}
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="flex items-center gap-1.5 text-sm font-semibold text-red">
          <AlertCircle size={15} aria-hidden="true" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-sm text-ink-soft">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
