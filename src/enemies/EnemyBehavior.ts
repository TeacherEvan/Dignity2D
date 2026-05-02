import type { EnemyKind } from "../game/types";

export type EnemyIntent =
  | "patrol"
  | "hunt-trail"
  | "fire-lane"
  | "guard-area"
  | "disrupt-coop";

export type EnemyPressureContext = {
  activeTrailCount: number;
  bothPlayersDrawing: boolean;
};

export function chooseEnemyIntent(
  kind: EnemyKind,
  context: EnemyPressureContext,
): EnemyIntent {
  if (kind === "disruptor" && context.bothPlayersDrawing) {
    return "disrupt-coop";
  }
  if (kind === "chaser" && context.activeTrailCount > 0) {
    return "hunt-trail";
  }
  if (kind === "shooter") {
    return "fire-lane";
  }
  if (kind === "orbiter") {
    return "guard-area";
  }
  return "patrol";
}

export function scaleEnemyPressure(
  baseSpeed: number,
  context: Pick<EnemyPressureContext, "bothPlayersDrawing">,
): number {
  return context.bothPlayersDrawing ? Math.round(baseSpeed * 1.3) : baseSpeed;
}
