import type { GameState } from "./types";

export const WIN_REVEAL_RATIO = 0.75;

export type CaptureScoreInput = {
  area: number;
  dangerMultiplier: number;
  streak: number;
  coOpBonus: number;
  combo: number;
};

export function hasWon(revealedRatio: number): boolean {
  return revealedRatio >= WIN_REVEAL_RATIO;
}

const COMBO_STEP = 0.15;
const COMBO_CAP = 2.5;

export function comboMultiplier(combo: number): number {
  return Math.min(COMBO_CAP, 1 + Math.max(0, combo - 1) * COMBO_STEP);
}

export function calculateCaptureScore(input: CaptureScoreInput): number {
  const combo = input.combo ?? 0;
  const base = Math.floor(input.area);
  const streakBonus = input.streak * 25;
  const comboFactor = comboMultiplier(combo);
  return Math.max(
    0,
    Math.floor(
      base * (input.dangerMultiplier + comboFactor - 1) +
        streakBonus +
        input.coOpBonus,
    ),
  );
}

export function awardCaptureScore(
  state: GameState,
  playerId: string,
  captureArea: number,
  combo = 0,
): GameState {
  const score = calculateCaptureScore({
    area: captureArea,
    dangerMultiplier: 1 + state.enemies.length * 0.1,
    streak: state.captures.length,
    coOpBonus: 0,
    combo,
  });

  return {
    ...state,
    won: hasWon(state.revealedRatio),
    players: state.players.map((player) =>
      player.id === playerId
        ? {
            ...player,
            score: player.score + score,
            combo: player.combo + 1,
          }
        : player,
    ),
  };
}

export function registerComboForPlayer(
  state: GameState,
  playerId: string,
): GameState {
  return {
    ...state,
    players: state.players.map((player) =>
      player.id === playerId ? { ...player, combo: player.combo + 1 } : player,
    ),
  };
}

export function resetComboForPlayer(
  state: GameState,
  playerId: string,
): GameState {
  return {
    ...state,
    players: state.players.map((player) =>
      player.id === playerId ? { ...player, combo: 0 } : player,
    ),
  };
}
