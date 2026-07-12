import { describe, expect, it } from "vitest";
import {
  damagePlayer,
  registerCombo,
  resetCombo,
  DEFAULT_LIVES,
  INVULN_MS,
} from "./player";
import { createInitialGameState } from "./types";

function stateWithLives(lives: number) {
  const state = createInitialGameState("solo", 320, 480);
  return {
    ...state,
    players: [{ ...state.players[0], lives, lastSafePosition: { x: 5, y: 5 } }],
  };
}

describe("player lives + game over", () => {
  it("decrements a life and grants invulnerability", () => {
    const base = stateWithLives(3);
    const result = damagePlayer(base, "p1", 1000);
    expect(result.lostLife).toBe(true);
    expect(result.state.players[0]?.lives).toBe(2);
    expect(result.state.players[0]?.invulnUntil).toBe(1000 + INVULN_MS);
    expect(result.state.players[0]?.position).toEqual({ x: 5, y: 5 });
    expect(result.gameOver).toBe(false);
  });

  it("ignores damage while invulnerable", () => {
    const hit = damagePlayer(stateWithLives(3), "p1", 1000);
    const second = damagePlayer(hit.state, "p1", 1000 + 100);
    expect(second.lostLife).toBe(false);
    expect(second.state.players[0]?.lives).toBe(2);
  });

  it("triggers game over at zero lives", () => {
    const oneLife = stateWithLives(1);
    const result = damagePlayer(oneLife, "p1", 2000);
    expect(result.state.players[0]?.lives).toBe(0);
    expect(result.gameOver).toBe(true);
    expect(result.state.gameOver).toBe(true);
  });

  it("does not damage an already lost game", () => {
    const over = { ...stateWithLives(0), gameOver: true };
    const result = damagePlayer(over, "p1", 1000);
    expect(result.lostLife).toBe(false);
  });

  it("combo increments and resets", () => {
    const p = { ...stateWithLives(3).players[0], combo: 0 };
    expect(registerCombo(p).combo).toBe(1);
    expect(resetCombo(p).combo).toBe(0);
  });

  it("defaults lives to three", () => {
    expect(DEFAULT_LIVES).toBe(3);
  });
});
