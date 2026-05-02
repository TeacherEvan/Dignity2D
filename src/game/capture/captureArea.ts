import { isPointInPolygon } from "../geometry/border";
import type { CaptureRegion, GameState, Point, Trail } from "../types";

export function calculatePolygonArea(points: Point[]): number {
  if (points.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    sum += current.x * next.y - next.x * current.y;
  }
  return Math.abs(sum) / 2;
}

export function isClosedTrail(trail: Trail, tolerance = 1): boolean {
  const first = trail.points[0];
  const last = trail.points[trail.points.length - 1];
  return (
    Math.abs(first.x - last.x) <= tolerance &&
    Math.abs(first.y - last.y) <= tolerance
  );
}

function calculateCoveredArea(
  polygon: Point[],
  priorPolygons: Point[][],
  imageSize: GameState["imageSize"],
): number {
  let coveredCells = 0;
  const minX = Math.max(0, Math.floor(Math.min(...polygon.map((point) => point.x))));
  const maxX = Math.min(
    imageSize.width,
    Math.ceil(Math.max(...polygon.map((point) => point.x))),
  );
  const minY = Math.max(0, Math.floor(Math.min(...polygon.map((point) => point.y))));
  const maxY = Math.min(
    imageSize.height,
    Math.ceil(Math.max(...polygon.map((point) => point.y))),
  );

  for (let y = minY; y < maxY; y += 1) {
    for (let x = minX; x < maxX; x += 1) {
      const sample = { x: x + 0.5, y: y + 0.5 };
      if (!isPointInPolygon(sample, polygon)) {
        continue;
      }
      if (priorPolygons.some((priorPolygon) => isPointInPolygon(sample, priorPolygon))) {
        continue;
      }
      coveredCells += 1;
    }
  }

  return coveredCells;
}

function clearTrail(state: GameState, playerId: string): GameState {
  return {
    ...state,
    players: state.players.map((player) =>
      player.id === playerId
        ? { ...player, mode: "safe", activeTrail: null }
        : player,
    ),
  };
}

export function commitCaptureFromTrail(
  state: GameState,
  trail: Trail,
): GameState {
  if (!isClosedTrail(trail)) return state;
  const polygon = trail.points.slice(0, -1);
  const rawArea = calculatePolygonArea(polygon);
  if (rawArea <= 0) return clearTrail(state, trail.playerId);

  const priorPolygons = state.captures.map((capture) => capture.polygon);
  const priorRevealedArea = state.captures.reduce(
    (totalArea, capture) => totalArea + capture.area,
    0,
  );
  const area = calculateCoveredArea(
    polygon,
    priorPolygons,
    state.imageSize,
  );
  if (area <= 0) return clearTrail(state, trail.playerId);

  const capture: CaptureRegion = {
    id: `capture-${state.captures.length + 1}`,
    polygon,
    area,
  };
  const revealedArea = priorRevealedArea + area;
  const totalArea = state.imageSize.width * state.imageSize.height;
  return {
    ...state,
    captures: [...state.captures, capture],
    revealedRatio: Math.min(1, revealedArea / totalArea),
    players: clearTrail(state, trail.playerId).players,
  };
}
