import type { Point } from "../types";

export type ImageSize = { width: number; height: number };

export function isOnOuterBorder(
  point: Point,
  size: ImageSize,
  tolerance = 1,
): boolean {
  const onLeft = Math.abs(point.x) <= tolerance;
  const onRight = Math.abs(point.x - size.width) <= tolerance;
  const onTop = Math.abs(point.y) <= tolerance;
  const onBottom = Math.abs(point.y - size.height) <= tolerance;
  return onLeft || onRight || onTop || onBottom;
}

export function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    const intersects =
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function isSafePoint(
  point: Point,
  size: ImageSize,
  captures: Point[][],
): boolean {
  return (
    isOnOuterBorder(point, size) ||
    captures.some((polygon) => isPointInPolygon(point, polygon))
  );
}
