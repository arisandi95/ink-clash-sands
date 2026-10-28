import type { Team } from '@inkclash/shared';

export interface TeamAssignable {
  id: string;
  team: Team | null;
}

export function autoAssignTeams<T extends TeamAssignable>(players: T[]): Map<string, Team> {
  const result = new Map<string, Team>();
  const counts: Record<Team, number> = { A: 0, B: 0 };

  for (const player of players) {
    if (player.team) {
      result.set(player.id, player.team);
      counts[player.team] += 1;
    }
  }

  for (const player of players) {
    if (result.has(player.id)) {
      continue;
    }
    const target: Team = counts.A <= counts.B ? 'A' : 'B';
    result.set(player.id, target);
    counts[target] += 1;
  }

  return result;
}

export function shuffleTeams<T extends { id: string }>(players: T[]): Map<string, Team> {
  const shuffled = [...players];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(Math.random() * (index + 1));
    const current = shuffled[index] as T;
    shuffled[index] = shuffled[swapWith] as T;
    shuffled[swapWith] = current;
  }
  const result = new Map<string, Team>();
  shuffled.forEach((player, index) => {
    result.set(player.id, index % 2 === 0 ? 'A' : 'B');
  });
  return result;
}

export function teamSizes(players: TeamAssignable[]): Record<Team, number> {
  return players.reduce<Record<Team, number>>(
    (acc, player) => {
      if (player.team) {
        acc[player.team] += 1;
      }
      return acc;
    },
    { A: 0, B: 0 }
  );
}

export function teamsBalanced(players: TeamAssignable[]): boolean {
  const sizes = teamSizes(players);
  return Math.abs(sizes.A - sizes.B) <= 1;
}

export function buildTeamQueue(players: TeamAssignable[], shuffle: (items: string[]) => string[]): string[] {
  const teamA = shuffle(players.filter((player) => player.team === 'A').map((player) => player.id));
  const teamB = shuffle(players.filter((player) => player.team === 'B').map((player) => player.id));
  const queue: string[] = [];
  let indexA = 0;
  let indexB = 0;
  let turn: Team = 'A';
  while (indexA < teamA.length || indexB < teamB.length) {
    if (turn === 'A' && indexA < teamA.length) {
      queue.push(teamA[indexA] as string);
      indexA += 1;
    } else if (turn === 'B' && indexB < teamB.length) {
      queue.push(teamB[indexB] as string);
      indexB += 1;
    } else if (indexA < teamA.length) {
      queue.push(teamA[indexA] as string);
      indexA += 1;
    } else if (indexB < teamB.length) {
      queue.push(teamB[indexB] as string);
      indexB += 1;
    }
    turn = turn === 'A' ? 'B' : 'A';
  }
  return queue;
}
