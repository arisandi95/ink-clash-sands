import {
  bigint,
  char,
  datetime,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  tinyint,
  uniqueIndex,
  varchar
} from 'drizzle-orm/mysql-core';

export const words = mysqlTable(
  'words',
  {
    id: int('id').autoincrement().primaryKey(),
    text: varchar('text', { length: 64 }).notNull(),
    category: varchar('category', { length: 32 }).notNull(),
    lang: char('lang', { length: 2 }).notNull().default('id'),
    active: tinyint('active').notNull().default(1)
  },
  (table) => [uniqueIndex('uq_word_cat').on(table.text, table.category)]
);

export const games = mysqlTable('games', {
  id: bigint('id', { mode: 'number' }).autoincrement().primaryKey(),
  roomCode: char('room_code', { length: 6 }).notNull(),
  mode: mysqlEnum('mode', ['classic', 'team']).notNull(),
  category: varchar('category', { length: 32 }).notNull(),
  rounds: int('rounds').notNull(),
  drawSeconds: int('draw_seconds').notNull(),
  startedAt: datetime('started_at').notNull(),
  endedAt: datetime('ended_at'),
  winnerTeam: mysqlEnum('winner_team', ['A', 'B']),
  scoreTeamA: int('score_team_a'),
  scoreTeamB: int('score_team_b')
});

export const gamePlayers = mysqlTable(
  'game_players',
  {
    id: bigint('id', { mode: 'number' }).autoincrement().primaryKey(),
    gameId: bigint('game_id', { mode: 'number' })
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    nickname: varchar('nickname', { length: 24 }).notNull(),
    team: mysqlEnum('team', ['A', 'B']),
    score: int('score').notNull().default(0),
    rankPos: int('rank_pos').notNull().default(0)
  },
  (table) => [
    index('idx_game_player_game').on(table.gameId),
    index('idx_game_player_nick').on(table.nickname)
  ]
);

export const turns = mysqlTable(
  'turns',
  {
    id: bigint('id', { mode: 'number' }).autoincrement().primaryKey(),
    gameId: bigint('game_id', { mode: 'number' })
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    round: int('round').notNull(),
    drawerNickname: varchar('drawer_nickname', { length: 24 }).notNull(),
    word: varchar('word', { length: 64 }).notNull(),
    drawingTeam: mysqlEnum('drawing_team', ['A', 'B']),
    correctGuessers: int('correct_guessers').notNull().default(0),
    startedAt: datetime('started_at').notNull(),
    endedAt: datetime('ended_at').notNull()
  },
  (table) => [index('idx_turn_game').on(table.gameId)]
);

export type WordRow = typeof words.$inferSelect;
export type GameRow = typeof games.$inferSelect;
