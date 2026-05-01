import { cancelTrail } from "./capture/trailState";
import type { GameState, Point } from "./types";

function distanceToSegment(point: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(point.x - a.x, point.y - a.y);
  const t = Math.max(
    0,
    Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq),
  );
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

export function circleHitsPolyline(
  center: Point,
  radius: number,
  points: Point[],
): boolean {
  for (let i = 1; i < points.length; i++) {
    if (distanceToSegment(center, points[i - 1], points[i]) <= radius)
      return true;
  }
  return false;
}

export function cancelTrailOnProjectileHit(
  state: GameState,
  playerId: string,
): GameState {
  return cancelTrail(state, playerId);
}
