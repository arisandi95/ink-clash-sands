import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, Hash, Radio, Users } from 'lucide-react';
import { Wordmark } from '../components/Wordmark';
import { SoundToggle, ThemeToggle } from '../components/AppControls';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Banner } from '../components/ui/Banner';
import { Avatar } from '../components/ui/Avatar';
import { createRoom, joinRoom } from '../lib/actions';
import { useAppStore } from '../lib/store';
import { navigate } from '../lib/router';
import { cn } from '../lib/cn';

export interface LandingProps {
  initialCode?: string | null;
}

function lastToastMessage(fallback: string): string {
  const toasts = useAppStore.getState().toasts;
  return toasts[toasts.length - 1]?.message ?? fallback;
}

const AVATAR_OPTIONS: { id: string; label: string }[] = [
  { id: 'avatar-1', label: 'Klasik' },
  { id: 'avatar-2', label: 'Keren' },
  { id: 'avatar-3', label: 'Gembira' },
  { id: 'avatar-4', label: 'Hipster' },
  { id: 'avatar-5', label: 'Cantik' },
  { id: 'avatar-6', label: 'Unik' },
  { id: 'avatar-7', label: "S'antai" },
  { id: 'avatar-8', label: 'Ceria' },
  { id: 'avatar-9', label: 'Tegas' },
  { id: 'avatar-10', label: 'Aneh' },
  { id: 'avatar-11', label: 'Mewah' },
  { id: 'avatar-12', label: 'Simpel' }
];

export function Landing({ initialCode = null }: LandingProps) {
  const nicknameStored = useAppStore((state) => state.nickname);
  const avatarStored = useAppStore((state) => state.avatar);
  const connected = useAppStore((state) => state.connected);
  const [nickname, setNickname] = useState(nicknameStored);
  const [avatarSeed, setAvatarSeed] = useState(avatarStored || AVATAR_OPTIONS[0].id);
  const [code, setCode] = useState(initialCode ?? '');
  const [nameError, setNameError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);
  const invited = Boolean(initialCode);

  useEffect(() => {
    setCode(initialCode ?? '');
  }, [initialCode]);

  const validateName = (): boolean => {
    const trimmed = nickname.trim();
    if (trimmed.length < 2) {
      setNameError('Nama minimal 2 karakter');
      return false;
    }
    if (trimmed.length > 24) {
      setNameError('Nama maksimal 24 karakter');
      return false;
    }
    setNameError(null);
    return true;
  };

  const trimmed = nickname.trim();
  const isNameValid = trimmed.length >= 2 && trimmed.length <= 24;

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!validateName() || busy) {
      return;
    }
    setBusy('create');
    const ok = await createRoom(nickname, undefined, avatarSeed);
    setBusy(null);
    if (!ok) {
      setNameError(lastToastMessage('Tidak bisa membuat room. Coba lagi.'));
    }
  };

  const handleJoin = async (event: FormEvent) => {
    event.preventDefault();
    if (!validateName() || busy) {
      return;
    }
    const cleanCode = code.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(cleanCode)) {
      setCodeError('Kode room harus 6 karakter');
      return;
    }
    setCodeError(null);
    setBusy('join');
    const ok = await joinRoom(cleanCode, nickname, avatarSeed);
    setBusy(null);
    if (!ok) {
      setCodeError(
        lastToastMessage('Room tidak ditemukan. Cek kodenya atau minta host mengirim ulang link.')
      );
    }
  };

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col px-4 pb-6 pt-4 sm:px-6">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-bold text-ink-soft">
          <Radio size={15} aria-hidden="true" className={cn(connected ? 'text-green' : 'text-red')} />
          {connected ? 'Server kantor tersambung' : 'Menyambung ke server…'}
        </div>
        <div className="flex items-center gap-1">
          <SoundToggle />
          <ThemeToggle />
        </div>
      </header>

      <div className="grid flex-1 items-center gap-8 py-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:py-10">
        <section className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <div className="w-full max-w-[520px] rounded-board bg-frame p-3 shadow-board">
            <div className="relative flex aspect-[4/3] flex-col items-center justify-center overflow-hidden rounded-[3px] border border-line/60 bg-board">
              <Wordmark animate onBoard className="w-[86%]" />
              <p className="mt-1 text-sm font-bold text-on-board/70 sm:text-base">Ruang rapat, tanpa rapat.</p>
              <span className="absolute left-3 top-3 text-[10px] font-extrabold uppercase tracking-[0.12em] text-on-board/60">
                Papan tulis 01
              </span>
              <span className="absolute bottom-3 right-3 h-1.5 w-14 rounded-full bg-highlight" aria-hidden="true" />
            </div>
            <div className="mx-auto mt-1 h-1.5 w-2/3 rounded-b-[4px] bg-black/10" aria-hidden="true" />
          </div>

          <p className="mt-6 max-w-md text-base leading-relaxed text-ink-soft sm:text-lg">
            Gambar, tebak, dan tertawa bareng tim kantor. Satu orang menggambar, yang lain berebut
            menebak sebelum waktu habis.
          </p>
          <ul className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-sm font-bold text-ink-soft lg:justify-start">
            <li className="flex items-center gap-1.5">
              <Users size={16} aria-hidden="true" /> 2–20 pemain
            </li>
            <li className="flex items-center gap-1.5">
              <Radio size={16} aria-hidden="true" /> Jaringan kantor
            </li>
            <li className="flex items-center gap-1.5">
              <Hash size={16} aria-hidden="true" /> Tanpa akun
            </li>
          </ul>
        </section>

        <section className="mx-auto w-full max-w-md rounded-panel border border-line bg-panel p-4 shadow-raised sm:p-5">
          <h1 className="text-xl font-extrabold leading-tight text-ink">
            {invited ? 'Gabung ke room' : 'Masuk ke ruang rapat'}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {invited
              ? 'Masukkan nama kamu, lalu bergabung dengan tim yang sudah menunggu.'
              : 'Pilih nama, buat room baru, atau gabung pakai kode dari host.'}
          </p>

          {!connected ? (
            <Banner tone="warning" className="mt-3">
              Menyambung ke server. Tunggu sebentar…
            </Banner>
          ) : null}

          <div className="mt-4 flex flex-col gap-3">
            <Input
              label="Nama kamu"
              value={nickname}
              onChange={(event) => {
                setNickname(event.target.value);
                setNameError(null);
              }}
              placeholder="Misalnya: Rani"
              maxLength={24}
              showCount
              autoFocus
              autoComplete="nickname"
              error={nameError}
            />

            {isNameValid && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-ink-soft">Pilih avatar</span>
                  <div className="flex flex-wrap gap-1.5">
                    {AVATAR_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setAvatarSeed(option.id)}
                        aria-label={option.label}
                        aria-pressed={avatarSeed === option.id}
                        className={cn(
                          'relative h-12 w-12 shrink-0 rounded-control border border-line bg-panel-raised',
                          avatarSeed === option.id
                            ? 'border-blue bg-blue/10 ring-1 ring-blue'
                            : 'hover:border-blue/50 hover:bg-blue/5',
                          !connected && 'opacity-50 pointer-events-none'
                        )}
                      >
                        <Avatar nickname={nickname} size={32} seed={option.id} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {invited && isNameValid ? (
              <form onSubmit={handleJoin} className="flex flex-col gap-2">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Input
                      label="Kode room"
                      value={code}
                      readOnly
                      className="font-marker text-lg tracking-[0.2em]"
                      error={codeError}
                    />
                  </div>
                </div>
                <Button type="submit" loading={busy === 'join'} disabled={!connected} className="w-full">
                  Gabung
                </Button>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="text-sm font-bold text-ink-soft underline-offset-4 hover:text-ink hover:underline"
                >
                  Bukan room ini? Kembali ke beranda
                </button>
              </form>
            ) : invited ? (
              <div className="text-center text-sm text-ink-soft">Masukkan nama dulu untuk memilih avatar.</div>
            ) : (
              <>
                <form onSubmit={handleCreate}>
                  <Button
                    type="submit"
                    loading={busy === 'create'}
                    disabled={!connected || !isNameValid}
                    className="w-full"
                    icon={<ArrowRight size={17} aria-hidden="true" />}
                  >
                    Buat room
                  </Button>
                </form>

                <div className="my-1 flex items-center gap-3 text-xs font-bold text-ink-soft">
                  <span className="h-px flex-1 bg-line" aria-hidden="true" />
                  atau gabung
                  <span className="h-px flex-1 bg-line" aria-hidden="true" />
                </div>

                <form onSubmit={handleJoin} className="flex items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <Input
                      label="Kode room"
                      value={code}
                      onChange={(event) => {
                        setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
                        setCodeError(null);
                      }}
                      placeholder="ABC123"
                      inputMode="text"
                      autoCapitalize="characters"
                      autoComplete="off"
                      maxLength={6}
                      className="font-marker tracking-[0.18em]"
                      error={codeError}
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="secondary"
                    loading={busy === 'join'}
                    disabled={!connected || !isNameValid}
                  >
                    Gabung
                  </Button>
                </form>
              </>
            )}
          </div>

          <p className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-ink-soft">
            Semua berjalan di komputer server kantor. Tanpa akun, tanpa internet.
          </p>
        </section>
      </div>
    </div>
  );
}
