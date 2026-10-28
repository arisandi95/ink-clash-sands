import { cn } from '../../lib/cn';

export interface WordHintProps {
  hint: string[];
  wordLength: number;
  className?: string;
  large?: boolean;
}

export function WordHint({ hint, wordLength, className, large = false }: WordHintProps) {
  const revealed = hint
    .map((token, index) => ({ token, index }))
    .filter((entry) => entry.token !== '_' && entry.token !== ' ')
    .map((entry) => `huruf ke-${entry.index + 1} ${entry.token}`);

  const description =
    wordLength > 0
      ? `Petunjuk: ${wordLength} huruf${revealed.length > 0 ? `, ${revealed.join(', ')}` : ', belum ada huruf terbuka'}`
      : 'Petunjuk kata belum tersedia';

  const visibleTokens = hint.length > 0 ? hint : Array.from({ length: wordLength || 0 }, () => '_');

  return (
    <div className={cn('flex flex-wrap items-end justify-center gap-x-1 gap-y-1', className)} aria-label={description}>
      {visibleTokens.length === 0 ? (
        <span className="text-sm font-bold text-ink-soft">Menunggu kata…</span>
      ) : (
        visibleTokens.map((token, index) => {
          if (token === ' ') {
            return <span key={`gap-${index}`} className="w-3" aria-hidden="true" />;
          }
          const hidden = token === '_';
          return (
            <span
              key={`token-${index}`}
              aria-hidden="true"
              className={cn(
                'inline-flex items-end justify-center border-b-2 border-ink/70 font-marker leading-none text-ink',
                large ? 'min-w-6 pb-1 text-[32px] sm:text-[40px]' : 'min-w-4 pb-0.5 text-xl'
              )}
            >
              {hidden ? '' : token}
            </span>
          );
        })
      )}
      {wordLength > 0 ? (
        <span className="ml-1 self-center text-xs font-bold text-ink-soft tabular">({wordLength})</span>
      ) : null}
    </div>
  );
}
