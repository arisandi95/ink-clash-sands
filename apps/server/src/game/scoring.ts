export const DRAWER_BONUS = 50;

export function guessScore(remainingMs: number, totalMs: number, correctIndex: number): number {
  if (totalMs <= 0) {
    return 100;
  }
  const ratio = Math.max(0, Math.min(1, remainingMs / totalMs));
  const base = Math.round(500 * ratio) + 100;
  const multiplier = Math.max(0.4, 1 - 0.15 * Math.max(0, correctIndex));
  return Math.max(50, Math.round(base * multiplier));
}

export function isTeamScores(teamScores: { A: number; B: number }): boolean {
  return Number.isFinite(teamScores.A) && Number.isFinite(teamScores.B);
}
