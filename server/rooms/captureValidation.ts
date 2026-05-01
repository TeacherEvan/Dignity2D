import { isClosedTrail } from "../../src/game/capture/captureArea";
import type { Point, Trail } from "../../src/game/types";

function samePoint(a: Point, b: Point, tolerance = 1): boolean {
  return Math.abs(a.x - b.x) <= tolerance && Math.abs(a.y - b.y) <= tolerance;
}

export function mergeCoOpTrails(a: Trail, b: Trail): Trail | null {
  const aEnd = a.points[a.points.length - 1];
  const bStart = b.points[0];
  if (!samePoint(aEnd, bStart)) return null;
  return {
    playerId: "coop",
    startedAt: Math.min(a.startedAt, b.startedAt),
    points: [...a.points, ...b.points.slice(1)],
  };
}

export function canCommitCoOpCapture(trail: Trail): boolean {
  return isClosedTrail(trail);
}
