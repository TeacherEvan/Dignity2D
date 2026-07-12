import type { GameState, PlayerState } from "./types";

export const INVULN_MS = 1500;
export const DEFAULT_LIVES = 3;

export type DamageResult = {
  state: GameState;
  lostLife: boolean;
  gameOver: boolean;
};

function replacePlayer(state: GameState, player: PlayerState): GameState {
  return {
    ...state,
    players: state.players.map((item) =>
      item.id === player.id ? player : item,
    ),
  };
}

export function damagePlayer(
  state: GameState,
  playerId: string,
  now: number,
): DamageResult {
  const player = state.players.find((item) => item.id === playerId);
  if (!player) {
    return { state, lostLife: false, gameOver: false };
  }
  if (now < player.invulnUntil || player.lives <= 0 || state.gameOver) {
    return { state, lostLife: false, gameOver: state.gameOver };
  }

  const lives = player.lives - 1;
  const nextPlayer: PlayerState = {
    ...player,
    lives,
    combo: 0,
    invulnUntil: now + INVULN_MS,
    position: player.lastSafePosition,
    mode: "safe",
    activeTrail: null,
  };
  const withPlayer = replacePlayer(state, nextPlayer);
  const gameOver = lives <= 0;
  const nextState: GameState = {
    ...withPlayer,
    gameOver,
    projectiles: [],
    enemies: gameOver ? withPlayer.enemies : withPlayer.enemies,
  };

  return { state: nextState, lostLife: true, gameOver };
}

export function registerCombo(player: PlayerState): PlayerState {
  return { ...player, combo: player.combo + 1 };
}

export function resetCombo(player: PlayerState): PlayerState {
  return { ...player, combo: 0 };
}
