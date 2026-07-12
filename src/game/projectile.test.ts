import { describe, expect, it } from "vitest";
import {
  MAX_PROJECTILES_MOBILE,
  spawnProjectile,
  stepProjectiles,
  projectileHitsPoint,
  pruneProjectiles,
} from "./projectile";
import type { ProjectileState } from "./types";

const bounds = { width: 320, height: 480 };

function makeProj(over: Partial<ProjectileState> = {}): ProjectileState {
  return {
    id: "proj-1",
    ownerEnemyId: "enemy-1",
    position: { x: 100, y: 100 },
    velocity: { x: 50, y: 0 },
    radius: 6,
    bornAt: 0,
    ttl: 4000,
    ...over,
  };
}

describe("projectile", () => {
  it("caps the live projectile pool", () => {
    const existing: ProjectileState[] = Array.from(
      { length: MAX_PROJECTILES_MOBILE },
      (_, i) => makeProj({ id: `p${i}`, position: { x: i, y: 0 } }),
    );
    const spawned = spawnProjectile(existing, {
      id: "overflow",
      ownerEnemyId: "e",
      position: { x: 0, y: 0 },
      velocity: { x: 1, y: 0 },
      radius: 5,
    });
    expect(spawned).toHaveLength(MAX_PROJECTILES_MOBILE);
    expect(spawned.some((p) => p.id === "overflow")).toBe(false);
  });

  it("moves a projectile by velocity over time", () => {
    const moved = stepProjectiles([makeProj()], 1000, 1000, bounds);
    expect(moved[0]?.position.x).toBe(150);
  });

  it("expires projectiles past their lifetime", () => {
    const aged = makeProj({ bornAt: 0, ttl: 100 });
    expect(stepProjectiles([aged], 16, 500, bounds)).toHaveLength(0);
  });

  it("expires projectiles that leave the board", () => {
    const offboard = makeProj({
      position: { x: -10, y: 100 },
      velocity: { x: -50, y: 0 },
    });
    expect(stepProjectiles([offboard], 16, 16, bounds)).toHaveLength(0);
  });

  it("detects a hit on a point within radius", () => {
    const proj = makeProj({ position: { x: 100, y: 100 }, radius: 8 });
    expect(projectileHitsPoint(proj, { x: 104, y: 102 })).toBe(true);
    expect(projectileHitsPoint(proj, { x: 130, y: 100 })).toBe(false);
  });

  it("prunes by id", () => {
    const list = [makeProj({ id: "keep" }), makeProj({ id: "drop" })];
    const kept = pruneProjectiles(list, ["drop"]);
    expect(kept.map((p) => p.id)).toEqual(["keep"]);
  });
});
