import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Clapperboard,
  Code2,
  Copy,
  ListPlus,
  Lock,
  Minus,
  PawPrint,
  Plus,
  QrCode,
  Shuffle,
  Shapes,
  Triangle,
  Circle,
  UtensilsCrossed,
  LogOut
} from 'lucide-react';
import { LIMITS, type Category, type PublicPlayer, type Team } from '@inkclash/shared';
import { Wordmark } from '../components/Wordmark';
import { SoundToggle, ThemeToggle } from '../components/AppControls';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import { NameTag } from '../components/ui/NameTag';
import { Segmented } from '../components/ui/Segmented';
import { Chip } from '../components/ui/Chip';
import { Modal } from '../components/ui/Modal';
import { Textarea } from '../components/ui/Textarea';
import { useAppStore } from '../lib/store';
import {
  leaveRoom,
  shuffleTeams,
  startGame,
  switchTeam,
  updateSettings
} from '../lib/actions';
import { cn } from '../lib/cn';
import { customWordsFeedback, parseCustomWordsInput } from '../lib/custom-words';

const CATEGORY_OPTIONS: { value: Category; label: string; icon: typeof Shapes }[] = [
  { value: 'umum', label: 'Umum', icon: Shapes },
  { value: 'hewan', label: 'Hewan', icon: PawPrint },
  { value: 'makanan-indonesia', label: 'Makanan Indonesia', icon: UtensilsCrossed },
  { value: 'film', label: 'Film', icon: Clapperboard },
  { value: 'programming', label: 'Programming', icon: Code2 }
];

function Stepper({
  value,
  min,
  max,
  onChange,
  disabled,
  label,
  suffix
}: {
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  label: string;
  suffix?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-bold text-ink-soft">{label}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={disabled || value <= min}
          aria-label={`Kurangi ${label.toLowerCase()}`}
          className="inline-flex h-10 w-10 items-center justify-center rounded-control border border-line bg-panel-raised text-ink disabled:opacity-40"
        >
          <Minus size={16} aria-hidden="true" />
        </button>
        <span className="w-12 text-center text-sm font-extrabold text-ink tabular">
          {value}
          {suffix ? <span className="ml-0.5 text-xs font-bold text-ink-soft">{suffix}</span> : null}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={disabled || value >= max}
          aria-label={`Tambah ${label.toLowerCase()}`}
          className="inline-flex h-10 w-10 items-center justify-center rounded-control border border-line bg-panel-raised text-ink disabled:opacity-40"
        >
          <Plus size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function TeamColumn({
  team,
  players,
  selfId,
  onMove
}: {
  team: Team;
  players: PublicPlayer[];
  selfId: string | null;
  onMove: (playerId: string, team: Team) => void;
}) {
  const isBlue = team === 'A';
  const Icon = isBlue ? Circle : Triangle;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1.5">
      <h3 className={cn('flex items-center gap-1.5 text-sm font-extrabold', isBlue ? 'text-blue' : 'text-red')}>
        <Icon size={13} aria-hidden="true" />
        Tim {isBlue ? 'Biru' : 'Merah'}
        <span className="text-xs font-bold text-ink-soft tabular">({players.length})</span>
      </h3>
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1 scrollbar-thin">
        {players.length === 0 ? (
          <p className="rounded-control border border-dashed border-line px-2 py-3 text-center text-xs text-ink-soft">
            Belum ada anggota
          </p>
        ) : (
          players.map((player) => (
            <div key={player.id} className="flex flex-col gap-1">
              <NameTag player={player} isSelf={player.id === selfId} />
              {player.id === selfId ? (
                <button
                  type="button"
                  onClick={() => onMove(player.id, isBlue ? 'B' : 'A')}
                  className="self-end text-[11px] font-bold text-ink-soft underline-offset-2 hover:text-ink hover:underline"
                >
                  Pindah ke Tim {isBlue ? 'Merah' : 'Biru'}
                </button>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function Lobby() {
  const room = useAppStore((state) => state.room);
  const playerId = useAppStore((state) => state.playerId);
  const pushToast = useAppStore((state) => state.pushToast);
  const [qrOpen, setQrOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const serverCustomWords = room?.settings.customWords ?? [];
  const [wordSource, setWordSource] = useState<'category' | 'custom'>(
    serverCustomWords.length > 0 ? 'custom' : 'category'
  );
  const [customText, setCustomText] = useState(serverCustomWords.join('\n'));
  const parsedWords = useMemo(() => parseCustomWordsInput(customText), [customText]);
  const parsedKey = parsedWords.words.join('\u0000');
  const hostNow = Boolean(room && playerId === room.hostId);
  const serverCustomKey = serverCustomWords.join('\u0000');

  useEffect(() => {
    if (hostNow) {
      return;
    }
    setWordSource(serverCustomWords.length > 0 ? 'custom' : 'category');
    setCustomText(serverCustomWords.join('\n'));
  }, [hostNow, serverCustomKey]);

  useEffect(() => {
    if (!hostNow || wordSource !== 'custom') {
      return;
    }
    const timer = setTimeout(() => {
      void updateSettings({ customWords: parsedWords.words });
    }, 500);
    return () => clearTimeout(timer);
  }, [hostNow, wordSource, parsedKey]);

  if (!room) {
    return null;
  }

  const host = room.players.find((player) => player.id === room.hostId);
  const isHost = playerId === room.hostId;
  const link = `${window.location.origin}/r/${room.code}`;
  const connected = room.players.filter((player) => player.connected);
  const teamA = connected.filter((player) => player.team === 'A');
  const teamB = connected.filter((player) => player.team === 'B');
  const customActive = isHost ? wordSource === 'custom' : serverCustomWords.length > 0;
  const feedback = customWordsFeedback(parsedWords);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      pushToast('Link disalin', 'success');
    } catch {
      pushToast('Tidak bisa menyalin otomatis. Salin dari bilah alamat.', 'error');
    }
  };

  const moveTeam = (targetId: string, team: Team) => {
    if (targetId !== playerId) {
      return;
    }
    void switchTeam(team);
  };

  let startReason = '';
  if (room.settings.mode === 'team') {
    if (connected.length < 4) {
      startReason = 'Butuh minimal 4 pemain, masing-masing tim 2 orang.';
    } else if (teamA.length < 2 || teamB.length < 2) {
      startReason = 'Setiap tim butuh minimal 2 pemain.';
    } else if (Math.abs(teamA.length - teamB.length) > 1) {
      startReason = 'Jumlah anggota tim harus seimbang (selisih maksimal 1).';
    }
  } else if (connected.length < 2) {
    startReason = 'Butuh minimal 2 pemain untuk memulai.';
  }

  const handleStart = async () => {
    setStarting(true);
    await startGame();
    setStarting(false);
  };

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col px-4 pb-6 pt-4 sm:px-6">
      <header className="flex flex-wrap items-center gap-2">
        <Wordmark compact />
        <div className="ml-auto flex items-center gap-1">
          <SoundToggle />
          <ThemeToggle />
          <IconButton label="Keluar room" tone="red" onClick={leaveRoom} icon={<LogOut size={19} />} />
        </div>
      </header>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="rounded-board border border-line bg-panel-raised px-4 py-2 shadow-note">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-ink-soft">Kode room</p>
          <p className="font-marker text-4xl leading-none tracking-[0.18em] text-ink">{room.code}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" icon={<Copy size={16} aria-hidden="true" />} onClick={() => void copyLink()}>
            Salin link
          </Button>
          <Button variant="secondary" size="sm" icon={<QrCode size={16} aria-hidden="true" />} onClick={() => setQrOpen(true)}>
            Tampilkan QR
          </Button>
        </div>
        <p className="w-full text-sm text-ink-soft sm:ml-auto sm:w-auto">
          {connected.length}/{room.settings.maxPlayers} pemain · {room.settings.rounds} ronde ·{' '}
          {room.settings.drawSeconds} detik
        </p>
      </div>

      <div className="mt-4 grid flex-1 gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section className="flex min-h-0 flex-col rounded-panel border border-line bg-panel/70 p-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-extrabold text-ink">
              Pemain <span className="text-ink-soft tabular">({connected.length})</span>
            </h2>
            {room.settings.mode === 'team' && isHost ? (
              <Button
                variant="secondary"
                size="sm"
                icon={<Shuffle size={15} aria-hidden="true" />}
                onClick={() => void shuffleTeams()}
              >
                Acak tim
              </Button>
            ) : null}
          </div>

          {room.settings.mode === 'team' ? (
            <div className="mt-2 flex min-h-0 flex-1 flex-col gap-3 sm:flex-row">
              <TeamColumn team="A" players={teamA} selfId={playerId} onMove={moveTeam} />
              <div className="w-px bg-line" aria-hidden="true" />
              <TeamColumn team="B" players={teamB} selfId={playerId} onMove={moveTeam} />
            </div>
          ) : (
            <div className="mt-2 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1 scrollbar-thin">
              {connected.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink-soft">Belum ada pemain.</p>
              ) : (
                connected.map((player) => (
                  <NameTag key={player.id} player={player} isSelf={player.id === playerId} />
                ))
              )}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3 rounded-panel border border-line bg-panel p-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-extrabold text-ink">Pengaturan</h2>
            {!isHost ? (
              <span className="flex items-center gap-1 text-xs font-bold text-ink-soft">
                <Lock size={13} aria-hidden="true" /> Hanya host
              </span>
            ) : null}
          </div>

          <Segmented
            label="Mode permainan"
            value={room.settings.mode}
            onChange={(mode) => void updateSettings({ mode })}
            disabled={!isHost}
            options={[
              { value: 'classic', label: 'Klasik' },
              { value: 'team', label: 'Tim' }
            ]}
          />

          <Segmented
            label="Sumber kata"
            value={wordSource}
            onChange={(next) => {
              setWordSource(next);
              if (next === 'category') {
                void updateSettings({ customWords: [] });
              }
            }}
            disabled={!isHost}
            options={[
              { value: 'category', label: 'Kategori' },
              {
                value: 'custom',
                label: 'Kata kustom',
                icon: <ListPlus size={15} aria-hidden="true" />
              }
            ]}
          />

          {customActive ? (
            <div className="flex flex-col gap-1.5">
              <Textarea
                label="Masukkan kata (pisahkan dengan koma atau baris baru)"
                hint="Hanya huruf dan angka, 2–64 karakter per kata."
                value={customText}
                onChange={(event) => setCustomText(event.target.value)}
                onBlur={() => {
                  if (isHost && wordSource === 'custom') {
                    void updateSettings({ customWords: parsedWords.words });
                  }
                }}
                disabled={!isHost}
                rows={4}
              />
              <div className="flex items-center justify-between gap-2 text-xs font-bold text-ink-soft">
                <span className="tabular">
                  {parsedWords.words.length}/{LIMITS.maxCustomWords} kata
                </span>
                {!isHost ? <span>Hanya host yang bisa mengubah</span> : null}
              </div>
              {feedback.length > 0 ? (
                <ul className="flex flex-col gap-0.5 text-xs text-ink-soft">
                  {feedback.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <div>
            <p className="mb-1.5 text-sm font-bold text-ink-soft">
              Kategori
              {customActive ? (
                <span className="ml-1 text-xs font-semibold">
                  (dinonaktifkan karena kata kustom aktif)
                </span>
              ) : null}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <Chip
                    key={option.value}
                    selected={room.settings.category === option.value}
                    disabled={!isHost || customActive}
                    onClick={() => void updateSettings({ category: option.value })}
                    icon={<Icon size={15} aria-hidden="true" />}
                  >
                    {option.label}
                  </Chip>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-line pt-3">
            <Stepper
              label="Jumlah ronde"
              value={room.settings.rounds}
              min={1}
              max={10}
              disabled={!isHost}
              onChange={(rounds) => void updateSettings({ rounds })}
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-ink-soft">Waktu gambar</span>
              <div className="w-[min(240px,60%)]">
                <Segmented
                  label="Waktu gambar"
                  value={String(room.settings.drawSeconds)}
                  onChange={(value) => void updateSettings({ drawSeconds: Number(value) })}
                  disabled={!isHost}
                  options={[
                    { value: '60', label: '60' },
                    { value: '80', label: '80' },
                    { value: '100', label: '100' },
                    { value: '120', label: '120' }
                  ]}
                />
              </div>
            </div>
            <Stepper
              label="Maksimal pemain"
              value={room.settings.maxPlayers}
              min={2}
              max={20}
              disabled={!isHost}
              onChange={(maxPlayers) => void updateSettings({ maxPlayers })}
            />
          </div>

          <div className="mt-auto border-t border-line pt-3">
            {isHost ? (
              <>
                <Button
                  className="w-full"
                  loading={starting}
                  disabled={Boolean(startReason) || connected.length < 2}
                  onClick={() => void handleStart()}
                >
                  Mulai game
                </Button>
                {startReason ? <p className="mt-2 text-center text-xs font-bold text-ink-soft">{startReason}</p> : null}
              </>
            ) : (
              <p className="rounded-control bg-panel-raised px-3 py-2 text-center text-sm font-bold text-ink-soft">
                Menunggu {host?.nickname ?? 'host'} memulai game
              </p>
            )}
            {!isHost && startReason ? (
              <p className="mt-1 text-center text-xs text-ink-soft">{startReason}</p>
            ) : null}
          </div>
        </section>
      </div>

      <Modal
        open={qrOpen}
        onOpenChange={setQrOpen}
        title="Pindai untuk bergabung"
        description={`Bagikan link room ${room.code} ke rekan di jaringan yang sama.`}
      >
        <div className="flex flex-col items-center gap-3">
          <img
            src={`/api/qr?text=${encodeURIComponent(link)}`}
            alt={`QR code untuk bergabung ke room ${room.code}`}
            width={280}
            height={280}
            className="h-auto w-full max-w-[280px] rounded-control bg-panel-raised"
          />
          <p className="w-full break-all rounded-control border border-line bg-panel px-2 py-1.5 text-center text-xs font-semibold text-ink-soft">
            {link}
          </p>
          <Button variant="secondary" size="sm" icon={<Check size={15} aria-hidden="true" />} onClick={() => setQrOpen(false)}>
            Selesai
          </Button>
        </div>
      </Modal>
    </div>
  );
}
