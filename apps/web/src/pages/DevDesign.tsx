import { useState } from 'react';
import { ArrowRight, Circle, Eye, Pencil, Plus, Shapes, Triangle, Volume2 } from 'lucide-react';
import type { PublicPlayer } from '@inkclash/shared';
import { ThemeToggle } from '../components/AppControls';
import { Avatar } from '../components/ui/Avatar';
import { Banner } from '../components/ui/Banner';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { IconButton } from '../components/ui/IconButton';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { NameTag } from '../components/ui/NameTag';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/Popover';
import { Segmented } from '../components/ui/Segmented';
import { StickyNote } from '../components/ui/StickyNote';
import { useAppStore } from '../lib/store';
import { cn } from '../lib/cn';

const PLAYERS: PublicPlayer[] = [
  { id: 'a', nickname: 'Rani', team: 'A', score: 1280, connected: true, isHost: true, guessed: true, drawing: false },
  { id: 'b', nickname: 'Budi', team: 'B', score: 1167, connected: true, isHost: false, guessed: false, drawing: true },
  { id: 'c', nickname: 'Sari', team: null, score: 980, connected: false, isHost: false, guessed: false, drawing: false }
];

const SWATCHES = [
  { token: 'wall', className: 'bg-wall' },
  { token: 'panel', className: 'bg-panel' },
  { token: 'panel-raised', className: 'bg-panel-raised' },
  { token: 'ink', className: 'bg-ink' },
  { token: 'ink-soft', className: 'bg-ink-soft' },
  { token: 'line', className: 'bg-line' },
  { token: 'highlight', className: 'bg-highlight' },
  { token: 'marker-blue', className: 'bg-blue' },
  { token: 'marker-red', className: 'bg-red' },
  { token: 'marker-green', className: 'bg-green' },
  { token: 'frame', className: 'bg-frame' },
  { token: 'board', className: 'bg-board' }
];

function PreviewPanel({ theme }: { theme: 'light' | 'dark' }) {
  const [mode, setMode] = useState('classic');
  const [category, setCategory] = useState('umum');
  const [name, setName] = useState('Rani');
  const [note, setNote] = useState('drawer');

  return (
    <section
      data-theme={theme}
      className="flex flex-col gap-4 rounded-panel border border-line bg-wall p-4 text-ink"
    >
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-extrabold">Tema {theme === 'light' ? 'Siang' : 'Malam'}</h2>
        <span className="rounded-control border border-line bg-panel-raised px-2 py-0.5 text-[11px] font-bold text-ink-soft">
          {theme === 'light' ? 'default' : 'data-theme="dark"'}
        </span>
      </header>

      <div className="grid grid-cols-6 gap-1.5">
        {SWATCHES.map((swatch) => (
          <div key={swatch.token} className="flex flex-col gap-1">
            <span className={cn('h-8 rounded-[6px] border border-line', swatch.className)} />
            <span className="truncate text-[9px] font-bold text-ink-soft">--{swatch.token}</span>
          </div>
        ))}
      </div>

      <div className="rounded-panel border border-line bg-panel p-3">
        <p className="font-marker text-2xl leading-tight text-ink">Permanent Marker</p>
        <p className="text-sm font-semibold text-ink-soft">Plus Jakarta Sans untuk semua UI.</p>
        <p className="mt-1 text-sm font-extrabold tabular text-ink">01:24 · 1280 poin</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button>Buat room</Button>
        <Button variant="secondary">Salin link</Button>
        <Button variant="ghost">Batal</Button>
        <Button variant="danger">Keluar</Button>
        <Button loading>Memuat</Button>
        <Button disabled>Nonaktif</Button>
        <IconButton label="Bunyi" icon={<Volume2 size={18} />} />
        <IconButton label="Aktif" active icon={<Pencil size={18} />} />
        <IconButton label="Lihat" tone="blue" active icon={<Eye size={18} />} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Nama kamu" value={name} onChange={(event) => setName(event.target.value)} maxLength={24} showCount />
        <Input label="Kode room" error="Room tidak ditemukan. Cek kodenya." defaultValue="ABC123" />
        <Input label="Nonaktif" disabled defaultValue="Tidak bisa diubah" />
        <Input label="Dengan petunjuk" hint="Nama minimal 2 karakter." defaultValue="Budi" />
      </div>

      <div className="flex flex-col gap-2">
        <Segmented
          label="Mode permainan"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'classic', label: 'Klasik' },
            { value: 'team', label: 'Tim' }
          ]}
        />
        <div className="flex flex-wrap gap-1.5">
          {['umum', 'hewan', 'film'].map((value) => (
            <Chip
              key={value}
              selected={category === value}
              onClick={() => setCategory(value)}
              icon={<Shapes size={14} aria-hidden="true" />}
            >
              {value === 'umum' ? 'Umum' : value === 'hewan' ? 'Hewan' : 'Film'}
            </Chip>
          ))}
          <Chip disabled>Nonaktif</Chip>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {PLAYERS.map((player) => (
          <NameTag key={player.id} player={player} isSelf={player.id === 'a'} />
        ))}
      </div>

      <div className="flex flex-wrap items-start gap-2">
        <Avatar nickname="Rani" />
        <Avatar nickname="Budi" size={48} />
        <Avatar nickname="Sari" size={64} />
        <StickyNote seed="note-a" className="px-3 py-2 text-sm font-bold">
          Sticky kuning
        </StickyNote>
        <StickyNote seed="note-b" tone="green" className="px-3 py-2 text-sm font-bold">
          Tebakan benar
        </StickyNote>
        <StickyNote seed="note-c" tone="plain" className="px-3 py-2 text-sm font-bold">
          Catatan polos
        </StickyNote>
      </div>

      <div className="flex flex-col gap-1.5">
        <Banner tone="info" icon={<Circle size={14} aria-hidden="true" />}>
          Info: giliran Tim Biru.
        </Banner>
        <Banner tone="warning" icon={<Triangle size={14} aria-hidden="true" />}>
          Menonton giliran Tim Merah.
        </Banner>
        <Banner tone="danger">Koneksi terputus. Mencoba menyambung lagi.</Banner>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="secondary" icon={<Plus size={16} aria-hidden="true" />}>
              Popover
            </Button>
          </PopoverTrigger>
          <PopoverContent side="top" align="start">
            <p className="text-sm font-extrabold text-ink">Layer</p>
            <p className="mt-1 text-xs text-ink-soft">Konten popover mengikuti tema root.</p>
          </PopoverContent>
        </Popover>
        <Button
          variant="secondary"
          onClick={() => setNote(note === 'drawer' ? 'guesser' : 'drawer')}
          icon={<ArrowRight size={16} aria-hidden="true" />}
        >
          Status: {note}
        </Button>
      </div>
    </section>
  );
}

export function DevDesign() {
  const [modalOpen, setModalOpen] = useState(false);
  const pushToast = useAppStore((state) => state.pushToast);

  return (
    <main className="min-h-[100dvh] bg-wall px-4 py-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-ink-soft">InkClash</p>
            <h1 className="font-marker text-4xl leading-tight text-ink">Rak komponen</h1>
            <p className="text-sm text-ink-soft">
              Playground komponen UI dasar di tema Siang dan Malam. Hanya tersedia saat dev.
            </p>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-2">
          <PreviewPanel theme="light" />
          <PreviewPanel theme="dark" />
        </div>

        <section className="flex flex-col gap-3 rounded-panel border border-line bg-panel p-4">
          <h2 className="text-sm font-extrabold text-ink">Dialog dan notifikasi</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setModalOpen(true)}>Buka modal</Button>
            <Button variant="secondary" onClick={() => pushToast('Link disalin', 'success')}>
              Toast sukses
            </Button>
            <Button variant="secondary" onClick={() => pushToast('Room sudah penuh', 'error')}>
              Toast error
            </Button>
            <Button variant="ghost" onClick={() => pushToast('Menunggu host memulai game')}>
              Toast info
            </Button>
          </div>
          <Modal
            open={modalOpen}
            onOpenChange={setModalOpen}
            title="Hapus seluruh gambar?"
            description="Semua goresan di papan akan hilang untuk semua pemain."
            footer={
              <>
                <Button variant="secondary" onClick={() => setModalOpen(false)}>
                  Batal
                </Button>
                <Button variant="danger" onClick={() => setModalOpen(false)}>
                  Hapus
                </Button>
              </>
            }
          >
            <p className="text-sm text-ink-soft">
              Tindakan ini tidak bisa dibatalkan. Gunakan tombol Undo bila hanya ingin membatalkan satu
              goresan.
            </p>
          </Modal>
        </section>
      </div>
    </main>
  );
}
