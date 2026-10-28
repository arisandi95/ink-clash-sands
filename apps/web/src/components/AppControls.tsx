import { Monitor, Moon, Sun, Volume2, VolumeX } from 'lucide-react';
import { useAppStore } from '../lib/store';
import { useTheme, type ThemeMode } from '../lib/theme';
import { IconButton } from './ui/IconButton';
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from './ui/Popover';
import { cn } from '../lib/cn';

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Terang', icon: Sun },
  { value: 'dark', label: 'Gelap', icon: Moon },
  { value: 'system', label: 'Ikuti sistem', icon: Monitor }
];

export function SoundToggle() {
  const soundOn = useAppStore((state) => state.soundOn);
  const setSoundOn = useAppStore((state) => state.setSoundOn);

  return (
    <IconButton
      label={soundOn ? 'Matikan bunyi' : 'Nyalakan bunyi'}
      active={soundOn}
      onClick={() => setSoundOn(!soundOn)}
      icon={soundOn ? <Volume2 size={19} /> : <VolumeX size={19} />}
    />
  );
}

export function ThemeToggle() {
  const [mode, setMode] = useTheme();
  const active = THEME_OPTIONS.find((option) => option.value === mode) ?? THEME_OPTIONS[2]!;
  const ActiveIcon = active.icon;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <IconButton label={`Tema: ${active.label}`} icon={<ActiveIcon size={19} />} />
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end" className="w-44 p-1">
        <p className="px-2 py-1 text-xs font-extrabold text-ink-soft">Tema tampilan</p>
        <div role="group" aria-label="Pilih tema" className="flex flex-col">
          {THEME_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <PopoverClose asChild key={option.value}>
                <button
                  type="button"
                  onClick={() => setMode(option.value)}
                  aria-pressed={mode === option.value}
                  className={cn(
                    'flex h-9 items-center gap-2 rounded-[7px] px-2 text-sm font-bold text-ink-soft hover:bg-panel hover:text-ink',
                    mode === option.value && 'bg-highlight text-on-highlight hover:bg-highlight hover:text-on-highlight'
                  )}
                >
                  <Icon size={16} aria-hidden="true" />
                  {option.label}
                </button>
              </PopoverClose>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
