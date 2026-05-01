import type { Point } from "../game/types";

export function interpolatePoint(from: Point, to: Point, alpha: number): Point {
  return {
    x: from.x + (to.x - from.x) * alpha,
    y: from.y + (to.y - from.y) * alpha,
  };
}

export function shouldPauseRankedScoring(latencyMs: number): boolean {
  return latencyMs > 350;
}
