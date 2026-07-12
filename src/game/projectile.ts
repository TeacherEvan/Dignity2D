import type { ProjectileState } from "./types";
import { MAX_PROJECTILES_MOBILE } from "../enemies/EnemySpawner";

export { MAX_PROJECTILES_MOBILE };

export type SpawnProjectileInput = {
  id: string;
  ownerEnemyId: string;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  radius?: number;
};

export function spawnProjectile(
  current: ProjectileState[],
  input: SpawnProjectileInput,
): ProjectileState[] {
  if (current.length >= MAX_PROJECTILES_MOBILE) {
    return current;
  }
  return [
    ...current,
    {
      id: input.id,
      ownerEnemyId: input.ownerEnemyId,
      position: { ...input.position },
      velocity: { ...input.velocity },
      radius: input.radius ?? 6,
      bornAt: performance.now(),
      ttl: 4000,
    },
  ];
}

export function stepProjectiles(
  projectiles: ProjectileState[],
  deltaMs: number,
  now: number,
  bounds: { width: number; height: number },
): ProjectileState[] {
  const seconds = deltaMs / 1000;
  return projectiles
    .map((projectile) => ({
      ...projectile,
      position: {
        x: projectile.position.x + projectile.velocity.x * seconds,
        y: projectile.position.y + projectile.velocity.y * seconds,
      },
    }))
    .filter((projectile) => {
      const onBoard =
        projectile.position.x >= -projectile.radius &&
        projectile.position.x <= bounds.width + projectile.radius &&
        projectile.position.y >= -projectile.radius &&
        projectile.position.y <= bounds.height + projectile.radius;
      const alive = now - projectile.bornAt <= projectile.ttl;
      return onBoard && alive;
    });
}

export function projectileHitsPoint(
  projectile: ProjectileState,
  point: { x: number; y: number },
): boolean {
  return (
    Math.hypot(
      projectile.position.x - point.x,
      projectile.position.y - point.y,
    ) <=
    projectile.radius + 2
  );
}

export function pruneProjectiles(
  projectiles: ProjectileState[],
  ids: string[],
): ProjectileState[] {
  const drop = new Set(ids);
  return projectiles.filter((projectile) => !drop.has(projectile.id));
}
