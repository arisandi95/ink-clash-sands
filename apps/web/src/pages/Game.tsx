import { Eye, LogOut, Check, Pencil } from 'lucide-react';
import { LIMITS, type GameEndPayload, type RankingEntry } from '@inkclash/shared';
import { BoardFrame } from '../components/canvas/BoardFrame';
import { DrawingCanvas } from '../components/canvas/DrawingCanvas';
import { MarkerTray } from '../components/canvas/MarkerTray';
import { PlayerList } from '../components/game/PlayerList';
import { ChatBox } from '../components/game/ChatBox';
import { WordHint } from '../components/game/WordHint';
import { TimerLine } from '../components/game/TimerLine';
import { WordChoiceOverlay } from '../components/game/WordChoiceOverlay';
import { TurnOverlay } from '../components/game/TurnOverlay';
import { TimeoutPanic } from '../components/game/TimeoutPanic';
import { Podium } from '../components/game/Podium';
import { Scoreboard } from '../components/game/Scoreboard';
import { SoundToggle, ThemeToggle } from '../components/AppControls';
import { IconButton } from '../components/ui/IconButton';
import { Banner } from '../components/ui/Banner';
import { useAppStore } from '../lib/store';
import { chooseWord, leaveRoom, startGame } from '../lib/actions';
import { prefersReducedMotion } from '../lib/clock';
import { cn } from '../lib/cn';

const PHASE_LABEL = {
  lobby: 'Lobby',
  choosing_word: 'Memilih kata',
  drawing: 'Menggambar',
  turn_end: 'Giliran selesai',
  game_end: 'Game selesai'
} as const;

function fallbackPodium(room: NonNullable<ReturnType<typeof useAppStore.getState>['room']>): GameEndPayload {
  const sorted = [...room.players].sort((a, b) => b.score - a.score || a.nickname.localeCompare(b.nickname));
  const ranking: RankingEntry[] = sorted.map((player, index) => ({
    playerId: player.id,
    nickname: player.nickname,
    score: player.score,
    rank: index + 1,
    team: player.team
  }));
  const teamScores = room.teamScores ?? undefined;
  const winnerTeam = teamScores
    ? teamScores.A > teamScores.B
      ? ('A' as const)
      : teamScores.B > teamScores.A
        ? ('B' as const)
        : null
    : null;
  return { ranking, teamScores, winnerTeam };
}

export function Game() {
  const room = useAppStore((state) => state.room);
  const playerId = useAppStore((state) => state.playerId);
  const myWord = useAppStore((state) => state.myWord);
  const wordOptions = useAppStore((state) => state.wordOptions);
  const gameEnd = useAppStore((state) => state.gameEnd);

  if (!room) {
    return null;
  }

  const self = room.players.find((player) => player.id === playerId);
  const drawer = room.players.find((player) => player.id === room.currentDrawerId);
  const isDrawer = Boolean(self?.drawing);
  const isHost = playerId === room.hostId;
  const isWatcher =
    room.settings.mode === 'team' &&
    room.phase === 'drawing' &&
    Boolean(self) &&
    self?.team !== room.drawingTeam;
  const reducedMotion = typeof window !== 'undefined' && prefersReducedMotion();

  const phase = room.phase;
  const endsAt = room.phaseEndsAt;
  const totalMs =
    phase === 'choosing_word'
      ? LIMITS.choosingWordMs
      : phase === 'drawing'
        ? room.settings.drawSeconds * 1000
        : phase === 'turn_end'
          ? LIMITS.turnEndMs
          : 1;

  const roundLabel = `Ronde ${Math.min(room.round, room.totalRounds)}/${room.totalRounds}`;
  const drawerName = drawer?.nickname ?? null;

  return (
    <div className="flex min-h-[100dvh] flex-col lg:h-[100dvh] lg:overflow-hidden">
      <header className="shrink-0 border-b border-line bg-panel/70 backdrop-blur">
        <div className="mx-auto w-full max-w-[1500px] px-3 py-2 sm:px-4">
          <div className="flex items-center gap-2">
            <span className="hidden select-none text-base font-extrabold tracking-tight text-ink sm:inline">
              InkClash
            </span>
            <span className="rounded-control border border-line bg-panel-raised px-2 py-0.5 text-xs font-extrabold text-ink-soft">
              {roundLabel}
            </span>
            <span className="hidden text-xs font-bold text-ink-soft sm:inline">
              Giliran {Math.min(room.turnNumber, room.turnTotal)}/{room.turnTotal}
            </span>
            <div className="ml-auto flex items-center gap-1">
              <Scoreboard scores={room.teamScores} drawingTeam={room.drawingTeam} className="mr-1 hidden sm:flex" />
              <SoundToggle />
              <ThemeToggle />
              <IconButton label="Keluar room" tone="red" onClick={leaveRoom} icon={<LogOut size={19} />} />
            </div>
          </div>

          <div className="mt-1 flex min-h-[52px] flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
            <div className="hidden w-[136px] shrink-0 text-xs font-extrabold text-ink-soft lg:block">
              {PHASE_LABEL[phase]}
            </div>
            <div className="flex min-w-0 flex-1 items-center justify-center">
              {isDrawer && phase === 'drawing' ? (
                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5">
                  <span className="flex items-center gap-1 text-xs font-extrabold text-ink-soft">
                    <Pencil size={13} aria-hidden="true" className="text-blue" /> Kamu menggambar
                  </span>
                  <span
                    data-testid="drawer-word"
                    className="font-marker text-2xl leading-tight text-ink sm:text-4xl"
                  >
                    {myWord ?? '…'}
                  </span>
                </div>
              ) : phase === 'choosing_word' ? (
                <p className="text-sm font-extrabold text-ink">
                  {isDrawer
                    ? 'Pilih satu kata di papan'
                    : drawerName
                      ? `${drawerName} sedang memilih kata`
                      : 'Sedang memilih kata'}
                </p>
              ) : phase === 'game_end' ? (
                <p className="text-sm font-extrabold text-ink-soft">Game selesai</p>
              ) : (
                <WordHint hint={room.hint} wordLength={room.wordLength} large />
              )}
            </div>
            <div className="hidden w-[136px] shrink-0 text-right text-xs font-bold text-ink-soft lg:block">
              {drawerName && phase !== 'game_end' ? `Penggambar: ${drawerName}` : ''}
            </div>
          </div>

          <div className="mt-1.5">
            <TimerLine endsAt={endsAt} totalMs={totalMs} paused={phase === 'game_end' || phase === 'lobby'} />
          </div>
          <Scoreboard scores={room.teamScores} drawingTeam={room.drawingTeam} className="mt-1.5 w-fit sm:hidden" />
        </div>
      </header>

      <main
        className={cn(
          'mx-auto flex w-full max-w-[1500px] flex-1 flex-col gap-2 px-3 pb-24 pt-2 sm:px-4 md:grid md:content-start md:grid-cols-[minmax(0,1fr)_280px] md:gap-3 lg:content-normal lg:grid-cols-[224px_minmax(0,1fr)_300px] lg:min-h-0 lg:pb-3',
          isDrawer && 'pb-28 lg:pb-3'
        )}
      >
        <div className="min-w-0 shrink-0 md:col-span-2 lg:col-span-1">
          <PlayerList players={room.players} selfId={playerId} />
        </div>

        <div className="flex min-w-0 flex-col gap-2 md:min-h-0">
          {isWatcher ? (
            <Banner tone="warning" icon={<Eye size={16} aria-hidden="true" />}>
              Menonton giliran Tim {room.drawingTeam === 'A' ? 'Biru' : 'Merah'}
            </Banner>
          ) : null}
          {self?.guessed && phase === 'drawing' ? (
            <Banner tone="info" icon={<Check size={16} aria-hidden="true" />}>
              Kamu sudah menebak benar. Tunggu giliran selesai.
            </Banner>
          ) : null}

          <div className="flex min-h-0 flex-1 flex-col justify-start gap-2 lg:justify-center">
            <div
              className="mx-auto w-full"
              style={{ maxWidth: 'min(960px, calc((100dvh - 330px) * 4 / 3))' }}
            >
              <BoardFrame label={drawerName && !isDrawer ? `Papan ${drawerName}` : undefined}>
                <DrawingCanvas canDraw={isDrawer} drawerName={drawerName ?? undefined} />
                <WordChoiceOverlay
                  room={room}
                  options={wordOptions}
                  isDrawer={isDrawer}
                  onChoose={(index) => void chooseWord(index)}
                />
                <TurnOverlay room={room} reducedMotion={reducedMotion} />
                <TimeoutPanic
                  endsAt={room.phaseEndsAt}
                  phase={room.phase}
                  round={room.round}
                  isDrawer={isDrawer}
                  isWatcher={isWatcher}
                  guessed={Boolean(self?.guessed)}
                  hasWordOptions={Boolean(wordOptions)}
                />
              </BoardFrame>
            </div>

            {isDrawer && phase === 'drawing' ? (
              <div className="shrink-0">
                <MarkerTray />
              </div>
            ) : null}
          </div>
        </div>

        <ChatBox />
      </main>

      {room.phase === 'game_end' ? (
        <Podium
          room={room}
          payload={gameEnd ?? fallbackPodium(room)}
          isHost={isHost}
          onRematch={() => void startGame()}
          onLeave={leaveRoom}
        />
      ) : null}
    </div>
  );
}
