import { describe, expect, it } from "vitest";
import { stepEnemies, StepContext } from "./enemyStep";
import type { EnemyState } from "../game/types";

const bounds = { width: 320, height: 480 };

function ctx(over: Partial<StepContext> = {}): StepContext {
  return {
    deltaMs: 100,
    now: 1000,
    bounds,
    activeTrailPoints: [],
    playerPositions: [{ x: 160, y: 400 }],
    bothPlayersDrawing: false,
    ...over,
  };
}

function enemy(over: Partial<EnemyState> = {}): EnemyState {
  return {
    id: "enemy-1",
    kind: "chaser",
    position: { x: 100, y: 100 },
    velocity: { x: 30, y: 0 },
    ...over,
  };
}

describe("stepEnemies", () => {
  it("chaser homes toward an exposed trail point", () => {
    const trail = [{ x: 200, y: 200 }];
    const result = stepEnemies([enemy()], ctx({ activeTrailPoints: trail }));
    const moved = result.enemies[0]!.position;
    expect(moved.x).toBeGreaterThan(100);
    expect(moved.y).toBeGreaterThan(100);
  });

  it("chaser patrols when no trail is exposed", () => {
    const result = stepEnemies([enemy()], ctx({ activeTrailPoints: [] }));
    const moved = result.enemies[0]!.position;
    expect(moved.x).toBeGreaterThan(100);
  });

  it("shooter emits a projectile on the fire cadence", () => {
    const result = stepEnemies(
      [enemy({ kind: "shooter", velocity: { x: 0, y: 0 } })],
      ctx({ now: 2200, deltaMs: 100 }),
    );
    expect(result.newProjectiles).toHaveLength(1);
    expect(result.newProjectiles[0]!.ownerEnemyId).toBe("enemy-1");
  });

  it("shooter stays quiet between fire ticks", () => {
    const result = stepEnemies(
      [enemy({ kind: "shooter", velocity: { x: 0, y: 0 } })],
      ctx({ now: 1000, deltaMs: 100 }),
    );
    expect(result.newProjectiles).toHaveLength(0);
  });

  it("orbiter circles the board center", () => {
    const before = enemy({
      kind: "orbiter",
      position: { x: 160, y: 144 },
      velocity: { x: 0, y: 0 },
    });
    const result = stepEnemies([before], ctx());
    const moved = result.enemies[0]!.position;
    expect(moved.x).not.toBe(160);
  });

  it("disruptor converges on trail midpoint when both players drawing", () => {
    const trail = [
      { x: 260, y: 240 },
      { x: 260, y: 260 },
    ];
    const result = stepEnemies(
      [enemy({ kind: "disruptor" })],
      ctx({ activeTrailPoints: trail, bothPlayersDrawing: true }),
    );
    const moved = result.enemies[0]!.position;
    expect(moved.x).toBeGreaterThan(100);
    expect(moved.y).toBeGreaterThan(100);
  });

  it("bounces off the board edges", () => {
    const nearEdge = enemy({
      position: { x: 310, y: 240 },
      velocity: { x: 80, y: 0 },
    });
    const result = stepEnemies([nearEdge], ctx({ deltaMs: 100 }));
    expect(result.enemies[0]!.position.x).toBeLessThanOrEqual(308);
    expect(result.enemies[0]!.velocity.x).toBeLessThan(0);
  });
});
