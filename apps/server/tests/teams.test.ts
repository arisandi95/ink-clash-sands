import { describe, expect, it } from 'vitest';
import { autoAssignTeams, buildTeamQueue, shuffleTeams, teamSizes, teamsBalanced } from '../src/game/teams.js';

const players = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ id: `p${index}`, team: null }));

describe('teams', () => {
  it('assigns balanced teams automatically', () => {
    const assigned = autoAssignTeams(players(5));
    const list = [...assigned.entries()].map(([id, team]) => ({ id, team }));
    const sizes = teamSizes(list);
    expect(sizes.A).toBe(3);
    expect(sizes.B).toBe(2);
    expect(teamsBalanced(list)).toBe(true);
  });

  it('shuffles everyone into balanced teams', () => {
    const assigned = shuffleTeams(players(6));
    const list = [...assigned.entries()].map(([id, team]) => ({ id, team }));
    expect(teamSizes(list)).toEqual({ A: 3, B: 3 });
  });

  it('alternates teams in the turn queue', () => {
    const list = [
      { id: 'a1', team: 'A' as const },
      { id: 'a2', team: 'A' as const },
      { id: 'b1', team: 'B' as const },
      { id: 'b2', team: 'B' as const }
    ];
    const queue = buildTeamQueue(list, (items) => items);
    expect(queue).toEqual(['a1', 'b1', 'a2', 'b2']);
  });
});
