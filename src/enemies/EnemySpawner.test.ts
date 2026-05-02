import { describe, expect, it } from "vitest";
import { createEnemyWave, MAX_PROJECTILES_MOBILE } from "./EnemySpawner";

describe("EnemySpawner", () => {
  it("creates readable alien kinds", () => {
    const wave = createEnemyWave(2, { width: 300, height: 400 });
    expect(wave.map((enemy) => enemy.kind)).toContain("chaser");
    expect(wave.map((enemy) => enemy.kind)).toContain("shooter");
  });

  it("caps mobile projectiles", () => {
    expect(MAX_PROJECTILES_MOBILE).toBeLessThanOrEqual(80);
  });

  it("caps enemy count for mobile readability", () => {
    expect(createEnemyWave(99, { width: 300, height: 400 })).toHaveLength(8);
  });

  it("keeps enemies inside board bounds", () => {
    const wave = createEnemyWave(5, { width: 300, height: 400 });
    expect(
      wave.every((enemy) => enemy.position.x >= 0 && enemy.position.x <= 300),
    ).toBe(true);
    expect(
      wave.every((enemy) => enemy.position.y >= 0 && enemy.position.y <= 400),
    ).toBe(true);
  });
});
