import { useMemo } from 'react';
import { hashCode } from '../../lib/hash';
import { PALETTE } from '../../lib/canvas/palette';
import { cn } from '../../lib/cn';

export interface AvatarProps {
  nickname: string;
  size?: number;
  className?: string;
  seed?: string;
}

const HEAD_SHAPES = ['circle', 'squircle', 'oval', 'roundrect'] as const;
const EYE_STYLES = ['dots', 'lines', 'happy', 'wide'] as const;
const MOUTH_STYLES = ['smile', 'open', 'flat', 'grin'] as const;
const ACCESSORIES = ['none', 'glasses', 'hat', 'hair', 'beanie'] as const;

export function Avatar({ nickname, size = 40, className, seed }: AvatarProps) {
  const design = useMemo(() => {
    const hash = hashCode((seed ?? nickname) || 'inkclash');
    const color = PALETTE[(hash >> 3) % PALETTE.length]?.hex ?? PALETTE[0]!.hex;
    const hairColor = PALETTE[(hash >> 7) % 8]?.hex ?? PALETTE[0]!.hex;
    return {
      head: HEAD_SHAPES[hash % HEAD_SHAPES.length]!,
      eyes: EYE_STYLES[(hash >> 2) % EYE_STYLES.length]!,
      mouth: MOUTH_STYLES[(hash >> 5) % MOUTH_STYLES.length]!,
      accessory: ACCESSORIES[(hash >> 9) % ACCESSORIES.length]!,
      color,
      hairColor,
      tilt: ((hash >> 11) % 5) - 2
    };
  }, [nickname, seed]);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      className={cn('shrink-0', className)}
      style={{ transform: `rotate(${design.tilt}deg)` }}
    >
      <g stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {design.accessory === 'hair' ? (
          <path d="M11 20c-1-8 5-13 13-13s14 5 13 13c-3-5-7-6-13-6s-10 1-13 6Z" fill={design.hairColor} />
        ) : null}
        {design.head === 'circle' ? (
          <circle cx="24" cy="26" r="14" fill="var(--panel-raised)" />
        ) : design.head === 'squircle' ? (
          <rect x="10" y="12" width="28" height="28" rx="10" fill="var(--panel-raised)" />
        ) : design.head === 'oval' ? (
          <ellipse cx="24" cy="26" rx="12" ry="15" fill="var(--panel-raised)" />
        ) : (
          <rect x="9" y="13" width="30" height="27" rx="6" fill="var(--panel-raised)" />
        )}

        {design.eyes === 'dots' ? (
          <>
            <circle cx="19" cy="24" r="1.8" fill="var(--ink)" />
            <circle cx="29" cy="24" r="1.8" fill="var(--ink)" />
          </>
        ) : design.eyes === 'lines' ? (
          <>
            <path d="M16 24h5" />
            <path d="M27 24h5" />
          </>
        ) : design.eyes === 'happy' ? (
          <>
            <path d="M16 25c1.5-2 3.5-2 5 0" />
            <path d="M27 25c1.5-2 3.5-2 5 0" />
          </>
        ) : (
          <>
            <circle cx="19" cy="24" r="2.6" fill="var(--panel-raised)" />
            <circle cx="29" cy="24" r="2.6" fill="var(--panel-raised)" />
            <circle cx="19" cy="24" r="1.1" fill="var(--ink)" />
            <circle cx="29" cy="24" r="1.1" fill="var(--ink)" />
          </>
        )}

        {design.mouth === 'smile' ? (
          <path d="M19 31c2 3 8 3 10 0" />
        ) : design.mouth === 'open' ? (
          <ellipse cx="24" cy="32" rx="3.4" ry="2.6" fill="var(--ink)" />
        ) : design.mouth === 'flat' ? (
          <path d="M20 32h8" />
        ) : (
          <path d="M18 30c2 4 10 4 12 0" fill="var(--panel-raised)" />
        )}

        {design.accessory === 'glasses' ? (
          <>
            <circle cx="19" cy="24" r="4.5" fill="none" stroke={design.color} />
            <circle cx="29" cy="24" r="4.5" fill="none" stroke={design.color} />
            <path d="M23.5 24h1" stroke={design.color} />
          </>
        ) : null}
        {design.accessory === 'hat' ? (
          <>
            <path d="M12 15h24" stroke={design.color} />
            <path d="M15 15c0-6 4-8 9-8s9 2 9 8" fill={design.color} />
          </>
        ) : null}
        {design.accessory === 'beanie' ? (
          <>
            <path d="M12 16c0-7 5-10 12-10s12 3 12 10Z" fill={design.color} />
            <path d="M12 16h24" stroke="var(--ink)" />
          </>
        ) : null}
      </g>
    </svg>
  );
}
