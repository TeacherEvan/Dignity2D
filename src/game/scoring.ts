export const WIN_REVEAL_RATIO = 0.75;

export type CaptureScoreInput = {
  area: number;
  dangerMultiplier: number;
  streak: number;
  coOpBonus: number;
};

export function hasWon(revealedRatio: number): boolean {
  return revealedRatio >= WIN_REVEAL_RATIO;
}

export function calculateCaptureScore(input: CaptureScoreInput): number {
  const base = Math.floor(input.area);
  const streakBonus = input.streak * 25;
  return Math.max(0, Math.floor(base * input.dangerMultiplier + streakBonus + input.coOpBonus));
}