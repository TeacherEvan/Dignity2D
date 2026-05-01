import type { EnemyState } from "../game/types";

export const MAX_PROJECTILES_MOBILE = 64;

export function createEnemyWave(
  level: number,
  bounds: { width: number; height: number },
): EnemyState[] {
  const kinds: EnemyState["kind"][] = [
    "chaser",
    "shooter",
    "orbiter",
    "disruptor",
  ];
  const count = Math.min(2 + level, 8);
  return Array.from({ length: count }, (_, index) => ({
    id: `enemy-${index + 1}`,
    kind: kinds[index % kinds.length],
    position: {
      x: bounds.width * ((index + 1) / (count + 1)),
      y: bounds.height * 0.35,
    },
    velocity: { x: index % 2 === 0 ? 30 : -30, y: 0 },
  }));
}
