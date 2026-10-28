import { Home, PlusCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useAppStore } from '../lib/store';
import { navigate } from '../lib/router';

export function RoomLost() {
  const resetRoom = useAppStore((state) => state.resetRoom);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-panel border border-line bg-panel p-5 text-center shadow-raised">
        <h1 className="text-xl font-extrabold text-ink">Room ini sudah tidak ada</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Server mungkin dimulai ulang, atau host sudah menutup room. Kamu bisa membuat room baru.
        </p>
        <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
          <Button
            icon={<PlusCircle size={17} aria-hidden="true" />}
            onClick={() => {
              resetRoom();
              navigate('/');
            }}
          >
            Buat room baru
          </Button>
          <Button
            variant="secondary"
            icon={<Home size={17} aria-hidden="true" />}
            onClick={() => {
              resetRoom();
              navigate('/');
            }}
          >
            Kembali ke beranda
          </Button>
        </div>
      </div>
    </div>
  );
}
