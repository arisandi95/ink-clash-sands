import { cn } from '../lib/cn';

export interface WordmarkProps {
  className?: string;
  animate?: boolean;
  compact?: boolean;
  onBoard?: boolean;
}

export function Wordmark({ className, animate = false, compact = false, onBoard = false }: WordmarkProps) {
  const ink = onBoard ? 'var(--on-board)' : 'var(--ink)';
  return (
    <svg
      viewBox="0 0 420 92"
      role="img"
      aria-label="InkClash"
      className={cn('max-w-full', compact ? 'h-9' : 'h-20', animate && 'wordmark-write', className)}
    >
      <text
        x="10"
        y="70"
        fill={ink}
        stroke={ink}
        strokeWidth="1.5"
        paintOrder="stroke"
        fontFamily='"Permanent Marker", cursive'
        fontSize={compact ? 54 : 82}
        letterSpacing="1"
      >
        InkClash
      </text>
      <path
        d="M14 80c72 8 238 8 386-2"
        fill="none"
        stroke="var(--highlight)"
        strokeWidth="9"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  );
}
