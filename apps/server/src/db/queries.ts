import { and, eq } from 'drizzle-orm';
import type { Category, Mode, Team } from '@inkclash/shared';
import { getDb, isDbAvailable } from './client.js';
import { gamePlayers, games, turns, words, type WordRow } from './schema.js';

export interface WordInput {
  text: string;
  category: string;
}

export async function fetchActiveWords(): Promise<WordRow[]> {
  if (!isDbAvailable()) {
    return [];
  }
  return getDb().select().from(words).where(eq(words.active, 1));
}

export async function upsertWords(entries: WordInput[]): Promise<number> {
  if (!isDbAvailable() || entries.length === 0) {
    return 0;
  }
  const db = getDb();
  let inserted = 0;
  const chunkSize = 100;
  for (let index = 0; index < entries.length; index += chunkSize) {
    const chunk = entries.slice(index, index + chunkSize);
    const result = await db
      .insert(words)
      .values(chunk.map((entry) => ({ text: entry.text, category: entry.category })))
      .onDuplicateKeyUpdate({ set: { active: 1 } });
    inserted += Number(result[0]?.affectedRows ?? chunk.length);
  }
  return inserted;
}

export async function wordExists(text: string, category: Category): Promise<boolean> {
  if (!isDbAvailable()) {
    return false;
  }
  const rows = await getDb()
    .select({ id: words.id })
    .from(words)
    .where(and(eq(words.text, text), eq(words.category, category)))
    .limit(1);
  return rows.length > 0;
}

export interface GameStartRow {
  roomCode: string;
  mode: Mode;
  category: string;
  rounds: number;
  drawSeconds: number;
  startedAt: Date;
}

export async function createGame(row: GameStartRow): Promise<number | null> {
  if (!isDbAvailable()) {
    return null;
  }
  try {
    const result = await getDb().insert(games).values(row).$returningId();
    return result[0]?.id ?? null;
  } catch (error) {
    console.error('[db] failed to create game', error);
    return null;
  }
}

export interface GameFinishRow {
  gameId: number;
  endedAt: Date;
  winnerTeam: Team | null;
  scoreTeamA: number | null;
  scoreTeamB: number | null;
}

export async function finishGame(row: GameFinishRow): Promise<void> {
  if (!isDbAvailable()) {
    return;
  }
  try {
    await getDb()
      .update(games)
      .set({
        endedAt: row.endedAt,
        winnerTeam: row.winnerTeam,
        scoreTeamA: row.scoreTeamA,
        scoreTeamB: row.scoreTeamB
      })
      .where(eq(games.id, row.gameId));
  } catch (error) {
    console.error('[db] failed to finish game', error);
  }
}

export interface PlayerResultRow {
  gameId: number;
  nickname: string;
  team: Team | null;
  score: number;
  rankPos: number;
}

export async function saveGamePlayers(rows: PlayerResultRow[]): Promise<void> {
  if (!isDbAvailable() || rows.length === 0) {
    return;
  }
  try {
    await getDb().insert(gamePlayers).values(rows);
  } catch (error) {
    console.error('[db] failed to save game players', error);
  }
}

export interface TurnResultRow {
  gameId: number;
  round: number;
  drawerNickname: string;
  word: string;
  drawingTeam: Team | null;
  correctGuessers: number;
  startedAt: Date;
  endedAt: Date;
}

export async function saveTurn(row: TurnResultRow): Promise<void> {
  if (!isDbAvailable()) {
    return;
  }
  try {
    await getDb().insert(turns).values(row);
  } catch (error) {
    console.error('[db] failed to save turn', error);
  }
}

export interface LeaderboardRow {
  nickname: string;
  wins: number;
  totalScore: number;
}

export async function fetchLeaderboard(limit = 20): Promise<LeaderboardRow[]> {
  if (!isDbAvailable()) {
    return [];
  }
  const db = getDb();
  const rows = await db
    .select({
      nickname: gamePlayers.nickname,
      totalScore: gamePlayers.score,
      rankPos: gamePlayers.rankPos,
      gameId: gamePlayers.gameId
    })
    .from(gamePlayers);
  const aggregated = new Map<string, LeaderboardRow>();
  for (const row of rows) {
    const existing = aggregated.get(row.nickname) ?? {
      nickname: row.nickname,
      wins: 0,
      totalScore: 0
    };
    existing.totalScore += row.totalScore;
    if (row.rankPos === 1) {
      existing.wins += 1;
    }
    aggregated.set(row.nickname, existing);
  }
  return [...aggregated.values()]
    .sort((a, b) => b.wins - a.wins || b.totalScore - a.totalScore)
    .slice(0, limit);
}
