import { Home } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { navigate } from '../lib/router';

export function NotFound() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-panel border border-line bg-panel p-5 text-center shadow-raised">
        <p className="font-marker text-3xl text-ink-soft">404</p>
        <h1 className="mt-1 text-xl font-extrabold text-ink">Halaman tidak ditemukan</h1>
        <p className="mt-2 text-sm text-ink-soft">Alamat ini tidak ada. Kembali ke beranda untuk mulai bermain.</p>
        <Button className="mt-5" icon={<Home size={17} aria-hidden="true" />} onClick={() => navigate('/')}>
          Kembali ke beranda
        </Button>
      </div>
    </div>
  );
}
