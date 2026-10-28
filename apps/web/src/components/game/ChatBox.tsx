import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, ChevronDown, MessageCircle, X } from 'lucide-react';
import type { ChatMessage } from '@inkclash/shared';
import { useAppStore } from '../../lib/store';
import { sendChat, submitGuess } from '../../lib/actions';
import { StickyNote } from '../ui/StickyNote';
import { cn } from '../../lib/cn';

function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState(() => window.matchMedia('(min-width: 768px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)');
    const listener = () => setDesktop(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);
  return desktop;
}

function MessageLine({ message }: { message: ChatMessage }) {
  if (message.kind === 'system' || message.kind === 'info' || message.kind === 'correct') {
    return (
      <StickyNote
        seed={message.id}
        tone={message.kind === 'correct' ? 'green' : 'yellow'}
        className="w-full px-2 py-1 text-xs font-bold"
      >
        {message.text}
      </StickyNote>
    );
  }
  return (
    <p className="px-1 text-sm leading-snug text-ink">
      <span
        className={cn(
          'font-extrabold',
          message.team === 'A' ? 'text-blue' : message.team === 'B' ? 'text-red' : 'text-ink'
        )}
      >
        {message.nickname}
      </span>
      <span className="text-ink-soft">: </span>
      <span className="break-words">{message.text}</span>
    </p>
  );
}

export function ChatBox() {
  const room = useAppStore((state) => state.room);
  const playerId = useAppStore((state) => state.playerId);
  const chat = useAppStore((state) => state.chat);
  const isDesktop = useIsDesktop();
  const [value, setValue] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const previousLength = useRef(chat.length);

  const player = room?.players.find((entry) => entry.id === playerId);
  const drawer = room?.players.find((entry) => entry.id === room?.currentDrawerId);
  const phase = room?.phase ?? 'lobby';
  const isDrawer = Boolean(player?.drawing);
  const isWatcher = Boolean(
    room && room.settings.mode === 'team' && phase === 'drawing' && player && player.team !== room.drawingTeam
  );
  const canGuess = Boolean(
    room &&
      phase === 'drawing' &&
      player &&
      !player.drawing &&
      !player.guessed &&
      (room.settings.mode === 'classic' || player.team === room.drawingTeam)
  );

  const placeholder = isDrawer
    ? 'Kamu sedang menggambar'
    : isWatcher
      ? `Menonton giliran Tim ${room?.drawingTeam === 'A' ? 'Biru' : 'Merah'}`
      : phase === 'drawing' && player?.guessed
        ? 'Kamu sudah menebak benar'
        : canGuess
          ? 'Tulis tebakanmu…'
          : 'Tulis pesan…';

  const inputDisabled = isDrawer || isWatcher;

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) {
      return;
    }
    const update = () => {
      setKeyboardOffset(Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop));
    };
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, []);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  useEffect(() => {
    const element = listRef.current;
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
    const delta = chat.length - previousLength.current;
    previousLength.current = chat.length;
    if (!isDesktop && !mobileOpen && delta > 0) {
      setUnread((count) => count + delta);
    }
  }, [chat, isDesktop, mobileOpen]);

  const lastMessage = chat[chat.length - 1];

  const form = useMemo(
    () => (
      <form
        className={cn(
          'flex items-end gap-1.5 border-t border-line bg-panel-raised p-2',
          canGuess && 'gap-2 border-t-2 border-blue/30 bg-blue/5 p-2.5'
        )}
        onSubmit={(event) => {
          event.preventDefault();
          const text = value.trim();
          if (!text || inputDisabled) {
            return;
          }
          if (canGuess) {
            void submitGuess(text);
          } else {
            void sendChat(text);
          }
          setValue('');
        }}
      >
        <label className="sr-only" htmlFor="chat-input">
          {canGuess ? 'Tebakan' : 'Pesan'}
        </label>
        <input
          id="chat-input"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          maxLength={canGuess ? 80 : 240}
          disabled={inputDisabled}
          autoComplete="off"
          className={cn(
            'min-w-0 flex-1 rounded-control border border-line bg-panel px-3 text-sm font-semibold text-ink placeholder:font-medium placeholder:text-ink-soft/70 focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/30 disabled:opacity-60',
            canGuess
              ? 'h-12 border-2 border-blue/60 bg-panel-raised px-3.5 text-base shadow-[0_2px_0_rgba(0,0,0,0.12)] placeholder:text-ink-soft/80 focus:border-blue focus:ring-4 focus:ring-blue/20'
              : 'h-10'
          )}
        />
        <button
          type="submit"
          disabled={inputDisabled || !value.trim()}
          aria-label={canGuess ? 'Kirim tebakan' : 'Kirim pesan'}
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-control border-b-[3px] border-b-black/20 bg-highlight text-on-highlight disabled:opacity-40',
            canGuess ? 'h-12 w-12 shadow-raised' : 'h-10 w-10'
          )}
        >
          <ArrowUp size={18} aria-hidden="true" />
        </button>
      </form>
    ),
    [canGuess, inputDisabled, placeholder, value]
  );

  const messages = (
    <div
      ref={listRef}
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto p-2 scrollbar-thin"
    >
      {chat.length === 0 ? (
        <p className="px-1 py-4 text-center text-sm text-ink-soft">
          {drawer ? `${drawer.nickname} akan menggambar. Mulai menebak!` : 'Belum ada pesan.'}
        </p>
      ) : (
        chat.map((message) => <MessageLine key={message.id} message={message} />)
      )}
    </div>
  );

  if (isDesktop) {
    return (
      <aside className="hidden h-full min-h-0 flex-col overflow-hidden rounded-panel border border-line bg-panel/70 md:flex md:shrink-0 lg:w-[300px]">
        <header className="flex items-center justify-between border-b border-line px-3 py-2">
          <h2 className="text-sm font-extrabold text-ink">Chat & tebakan</h2>
          {isWatcher ? <span className="text-xs font-bold text-ink-soft">Menonton</span> : null}
        </header>
        {messages}
        {form}
      </aside>
    );
  }

  return (
    <>
      {!mobileOpen ? (
        <div
          className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-panel/95 backdrop-blur md:hidden"
          style={{ bottom: keyboardOffset }}
        >
          {lastMessage ? (
            <div className="truncate px-3 pt-1 text-xs text-ink-soft">
              <span className="font-bold text-ink">{lastMessage.nickname ?? 'Info'}:</span> {lastMessage.text}
            </div>
          ) : null}
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => {
                setMobileOpen(true);
                setUnread(0);
              }}
              className="relative inline-flex h-10 w-11 shrink-0 items-center justify-center text-ink-soft"
              aria-label="Buka chat"
            >
              <MessageCircle size={20} />
              {unread > 0 ? (
                <span className="absolute right-1 top-1 min-w-4 rounded-full bg-red px-1 text-[10px] font-extrabold text-on-accent tabular">
                  {unread}
                </span>
              ) : null}
            </button>
            <div className="min-w-0 flex-1">{form}</div>
          </div>
        </div>
      ) : null}

      {mobileOpen ? (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-[color:var(--overlay)] md:hidden"
          style={{ bottom: keyboardOffset }}
        >
          <div className="mt-auto flex max-h-[78vh] flex-col overflow-hidden rounded-t-panel border border-line bg-panel">
            <header className="flex items-center justify-between border-b border-line px-3 py-2">
              <h2 className="text-sm font-extrabold">Chat & tebakan</h2>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Tutup chat"
                className="inline-flex h-9 w-9 items-center justify-center rounded-control border border-line text-ink-soft"
              >
                <X size={18} />
              </button>
            </header>
            {messages}
            {form}
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center gap-1 border-t border-line py-1 text-xs font-bold text-ink-soft"
            >
              <ChevronDown size={14} /> Tutup
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
