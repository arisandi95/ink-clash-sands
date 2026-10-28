import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-highlight text-on-highlight border-b-black/25 hover:brightness-[0.98] disabled:hover:brightness-100',
  secondary:
    'bg-panel-raised text-ink border border-line border-b-[3px] border-b-line hover:bg-panel',
  ghost: 'bg-transparent text-ink border border-transparent hover:bg-panel',
  danger: 'bg-red text-on-accent border-b-black/25 hover:brightness-[0.98]'
};

const sizes: Record<Size, string> = {
  sm: 'h-10 px-3 text-sm',
  md: 'h-11 px-4 text-[15px]'
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', loading = false, icon, children, disabled, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex select-none items-center justify-center gap-2 rounded-control border-b-[3px] font-extrabold transition-[transform,background-color,filter] duration-150 ease-office active:translate-y-[2px] active:border-b-[1px] disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spinner rounded-full border-2 border-current border-t-transparent"
        />
      ) : (
        icon
      )}
      <span>{children}</span>
    </button>
  );
});
