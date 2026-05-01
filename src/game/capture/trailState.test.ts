import { describe, expect, it } from "vitest";
import { cancelTrail, movePlayer } from "./trailState";
import { createInitialGameState } from "../types";

const size = { width: 100, height: 100 };

describe("trail state", () => {
  it("keeps player safe while moving along border", () => {
    const state = createInitialGameState("level", 100, 100);
    const next = movePlayer(state, "p1", { x: 0, y: 20 }, 100);
    expect(next.players[0].mode).toBe("safe");
    expect(next.players[0].activeTrail).toBeNull();
  });

  it("starts trail when player leaves safe border", () => {
    const state = createInitialGameState("level", size.width, size.height);
    const next = movePlayer(state, "p1", { x: 20, y: 20 }, 100);
    expect(next.players[0].mode).toBe("drawing");
    expect(next.players[0].activeTrail?.points).toEqual([
      { x: 0, y: 0 },
      { x: 20, y: 20 },
    ]);
  });

  it("extends active trail while drawing", () => {
    const state = movePlayer(
      createInitialGameState("level", 100, 100),
      "p1",
      { x: 20, y: 20 },
      100,
    );
    const next = movePlayer(state, "p1", { x: 30, y: 20 }, 120);
    expect(next.players[0].activeTrail?.points).toHaveLength(3);
  });

  it("cancels trail and restores last safe position", () => {
    const drawing = movePlayer(
      createInitialGameState("level", 100, 100),
      "p1",
      { x: 20, y: 20 },
      100,
    );
    const next = cancelTrail(drawing, "p1");
    expect(next.players[0].position).toEqual({ x: 0, y: 0 });
    expect(next.players[0].mode).toBe("safe");
    expect(next.players[0].activeTrail).toBeNull();
  });
});
