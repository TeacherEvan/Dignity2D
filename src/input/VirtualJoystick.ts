import type { Point } from "../game/types";

export function normalizeJoystickVector(vector: Point): Point {
  const length = Math.hypot(vector.x, vector.y);
  if (length === 0) return { x: 0, y: 0 };
  return { x: vector.x / length, y: vector.y / length };
}

export function applyDeadZone(vector: Point, deadZone: number): Point {
  return Math.hypot(vector.x, vector.y) < deadZone ? { x: 0, y: 0 } : vector;
}

export class VirtualJoystick {
  private direction: Point = { x: 0, y: 0 };

  setDirection(vector: Point): void {
    this.direction = applyDeadZone(normalizeJoystickVector(vector), 0.15);
  }

  getDirection(): Point {
    return this.direction;
  }
}
