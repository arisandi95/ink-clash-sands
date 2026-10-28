import { useEffect, useRef, useState } from 'react';
import { Loader2, WifiOff } from 'lucide-react';
import { usePath, roomCodeFromPath, navigate } from './lib/router';
import { useAppStore } from './lib/store';
import { Landing } from './pages/Landing';
import { Lobby } from './pages/Lobby';
import { Game } from './pages/Game';
import { RoomLost } from './pages/RoomLost';
import { NotFound } from './pages/NotFound';
import { DevDesign } from './pages/DevDesign';
import { Banner } from './components/ui/Banner';
import { ToastViewport } from './components/ui/Toast';

function RoomGate({ code }: { code: string }) {
  const storedCode = useAppStore((state) => state.roomCode);
  const nickname = useAppStore((state) => state.nickname);
  const connected = useAppStore((state) => state.connected);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setExpired(true), 7000);
    return () => clearTimeout(timer);
  }, []);

  if (!expired && storedCode === code && nickname.trim().length >= 2) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center px-4">
        <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-panel border border-line bg-panel p-6 text-center shadow-raised">
          <Loader2 size={26} className="animate-spin text-blue" aria-hidden="true" />
          <p className="text-base font-extrabold text-ink">Menyambung ke room {code}</p>
          <p className="text-sm text-ink-soft">
            {connected ? 'Memulihkan sesi kamu…' : 'Menunggu koneksi ke server kantor…'}
          </p>
          <button
            type="button"
            onClick={() => setExpired(true)}
            className="text-sm font-bold text-ink-soft underline-offset-4 hover:text-ink hover:underline"
          >
            Masuk dengan nama lain
          </button>
        </div>
      </div>
    );
  }

  return <Landing initialCode={code} />;
}

export default function App() {
  const path = usePath();
  const room = useAppStore((state) => state.room);
  const roomLost = useAppStore((state) => state.roomLost);
  const connectionLost = useAppStore((state) => state.connectionLost);
  const connected = useAppStore((state) => state.connected);
  const pushToast = useAppStore((state) => state.pushToast);
  const previousConnected = useRef(connected);
  const everConnected = useRef(connected);

  useEffect(() => {
    if (connected && !previousConnected.current && everConnected.current && room) {
      pushToast('Tersambung kembali', 'success');
    }
    if (connected) {
      everConnected.current = true;
    }
    previousConnected.current = connected;
  }, [connected, room, pushToast]);

  useEffect(() => {
    if (path === '/' && room) {
      navigate(`/r/${room.code}`, { replace: true });
    }
  }, [path, room]);

  const code = roomCodeFromPath(path);
  let page: JSX.Element;

  if (roomLost) {
    page = <RoomLost />;
  } else if (code) {
    if (room && room.code === code) {
      page = room.phase === 'lobby' ? <Lobby /> : <Game />;
    } else {
      page = <RoomGate code={code} />;
    }
  } else if (path === '/') {
    page = <Landing />;
  } else if (import.meta.env.DEV && path === '/dev/design') {
    page = <DevDesign />;
  } else {
    page = <NotFound />;
  }

  return (
    <>
      {connectionLost ? (
        <div className="fixed inset-x-0 top-0 z-[60] flex justify-center px-3 pt-2">
          <Banner tone="danger" icon={<WifiOff size={16} aria-hidden="true" />}>
            <span className="flex items-center gap-2">
              <Loader2 size={15} className="animate-spin" aria-hidden="true" />
              Koneksi terputus. Mencoba menyambung lagi.
            </span>
          </Banner>
        </div>
      ) : null}
      {page}
      <ToastViewport />
    </>
  );
}
