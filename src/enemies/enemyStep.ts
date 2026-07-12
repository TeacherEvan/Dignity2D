import type { EnemyState, EnemyKind, Point } from "../game/types";
import { chooseEnemyIntent, scaleEnemyPressure } from "./EnemyBehavior";

export const ENEMY_SPEED: Record<EnemyKind, number> = {
  chaser: 80,
  shooter: 45,
  orbiter: 1.2, // rad/s for circular orbit
  disruptor: 70,
};

const PROJECTILE_SPEED = 140;
const SHOOTER_FIRE_INTERVAL = 2200;
const ORBIT_RADIUS_RATIO = 0.3;

export type StepContext = {
  deltaMs: number;
  now: number;
  bounds: { width: number; height: number };
  activeTrailPoints: Point[];
  playerPositions: Point[];
  bothPlayersDrawing: boolean;
};

export type StepResult = {
  enemies: EnemyState[];
  newProjectiles: {
    ownerEnemyId: string;
    position: Point;
    velocity: Point;
  }[];
};

function clampToBounds(
  position: Point,
  bounds: { width: number; height: number },
  margin = 12,
): { position: Point; bounced: boolean } {
  let bounced = false;
  const x = Math.max(margin, Math.min(bounds.width - margin, position.x));
  const y = Math.max(margin, Math.min(bounds.height - margin, position.y));
  if (x !== position.x || y !== position.y) bounced = true;
  return { position: { x, y }, bounced };
}

function steerToward(from: Point, to: Point, speed: number): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy) || 1;
  return { x: (dx / dist) * speed, y: (dy / dist) * speed };
}

function nearest(point: Point, targets: Point[]): Point | null {
  if (targets.length === 0) return null;
  return targets.reduce((best, candidate) => {
    const dBest = Math.hypot(best.x - point.x, best.y - point.y);
    const dCand = Math.hypot(candidate.x - point.x, candidate.y - point.y);
    return dCand < dBest ? candidate : best;
  });
}

function trailMidpoint(points: Point[]): Point | null {
  if (points.length === 0) return null;
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), {
    x: 0,
    y: 0,
  });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

function stepEnemy(
  enemy: EnemyState,
  ctx: StepContext,
): { enemy: EnemyState; fired: boolean } {
  const seconds = ctx.deltaMs / 1000;
  const intent = chooseEnemyIntent(enemy.kind, {
    activeTrailCount: ctx.activeTrailPoints.length > 0 ? 1 : 0,
    bothPlayersDrawing: ctx.bothPlayersDrawing,
  });
  const pressure = scaleEnemyPressure(ENEMY_SPEED[enemy.kind], {
    bothPlayersDrawing: ctx.bothPlayersDrawing,
  });

  if (enemy.kind === "orbiter") {
    const center = {
      x: ctx.bounds.width / 2,
      y: ctx.bounds.height / 2,
    };
    const radius =
      Math.min(ctx.bounds.width, ctx.bounds.height) * ORBIT_RADIUS_RATIO;
    const dx = enemy.position.x - center.x;
    const dy = enemy.position.y - center.y;
    const angle = Math.atan2(dy, dx) + pressure * seconds;
    const next: EnemyState = {
      ...enemy,
      position: {
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius,
      },
      velocity: {
        x: -Math.sin(angle) * radius * pressure,
        y: Math.cos(angle) * radius * pressure,
      },
    };
    return { enemy: next, fired: false };
  }

  let velocity = enemy.velocity;
  if (enemy.kind === "chaser") {
    const target = nearest(enemy.position, ctx.activeTrailPoints);
    velocity = target
      ? steerToward(enemy.position, target, pressure)
      : enemy.velocity;
  } else if (enemy.kind === "disruptor") {
    const target = ctx.bothPlayersDrawing
      ? trailMidpoint(ctx.activeTrailPoints)
      : null;
    velocity = target
      ? steerToward(enemy.position, target, pressure)
      : {
          x: enemy.velocity.x || pressure,
          y: enemy.velocity.y,
        };
  }

  const moved: Point = {
    x: enemy.position.x + velocity.x * seconds,
    y: enemy.position.y + velocity.y * seconds,
  };
  const { position, bounced } = clampToBounds(moved, ctx.bounds);
  if (bounced) {
    velocity = { x: -velocity.x, y: -velocity.y };
  }

  const fired =
    enemy.kind === "shooter" &&
    Math.floor(ctx.now / SHOOTER_FIRE_INTERVAL) >
      Math.floor((ctx.now - ctx.deltaMs) / SHOOTER_FIRE_INTERVAL);

  return {
    enemy: { ...enemy, position, velocity },
    fired,
  };
}

export function stepEnemies(
  enemies: EnemyState[],
  ctx: StepContext,
): StepResult {
  const newProjectiles: StepResult["newProjectiles"] = [];
  const nextEnemies = enemies.map((enemy) => {
    const { enemy: stepped, fired } = stepEnemy(enemy, ctx);
    if (fired) {
      const target = nearest(enemy.position, ctx.playerPositions) ?? {
        x: enemy.position.x,
        y: enemy.position.y + 1,
      };
      const velocity = steerToward(enemy.position, target, PROJECTILE_SPEED);
      newProjectiles.push({
        ownerEnemyId: enemy.id,
        position: { ...enemy.position },
        velocity,
      });
    }
    return stepped;
  });
  return { enemies: nextEnemies, newProjectiles };
}
