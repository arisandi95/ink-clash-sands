import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, className, id, ...props },
  ref
) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label ? (
        <label htmlFor={textareaId} className="text-sm font-extrabold text-ink">
          {label}
        </label>
      ) : null}
      <textarea
        ref={ref}
        id={textareaId}
        aria-describedby={hint ? `${textareaId}-hint` : undefined}
        className={cn(
          'w-full min-h-[104px] resize-y rounded-control border border-line bg-panel-raised px-3 py-2 text-[15px] font-semibold leading-relaxed text-ink placeholder:font-medium placeholder:text-ink-soft/70 focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/30',
          className
        )}
        {...props}
      />
      {hint ? (
        <p id={`${textareaId}-hint`} className="text-xs text-ink-soft">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
