import { describe, expect, it } from "vitest";
import { createInitialGameState } from "./types";

describe("game types", () => {
  it("creates a hidden image state with zero reveal", () => {
    const state = createInitialGameState("level-1", 800, 600);
    expect(state.levelId).toBe("level-1");
    expect(state.revealedRatio).toBe(0);
    expect(state.players).toHaveLength(1);
    expect(state.players[0].mode).toBe("safe");
  });

  it("starts with no active captures or projectiles", () => {
    const state = createInitialGameState("level-1", 800, 600);
    expect(state.captures).toEqual([]);
    expect(state.projectiles).toEqual([]);
  });
});
