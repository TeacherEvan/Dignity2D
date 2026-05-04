import type { Point, Trail } from "../src/game/types";

export type ClientMessage =
  | { type: "create-room"; imageId: string }
  | { type: "join-room"; roomId: string }
  | {
      type: "input-frame";
      roomId: string;
      playerId: string;
      direction: Point;
      sequence: number;
    }
  | { type: "capture-proposal"; roomId: string; playerId: string; trail: Trail }
  | { type: "reconnect"; roomId: string; playerId: string };

export type ServerMessage =
  | { type: "room-created"; roomId: string }
  | { type: "room-joined"; roomId: string; playerId: string }
  | {
      type: "state-sync";
      roomId: string;
      stateVersion: number;
      imageId: string;
      playerIds: string[];
    }
  | {
      type: "capture-commit";
      roomId: string;
      captureId: string;
      revealedRatio: number;
    }
  | { type: "error"; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPoint(value: unknown): value is Point {
  return (
    isRecord(value) &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y)
  );
}

function isTrail(value: unknown): value is Trail {
  return (
    isRecord(value) &&
    isString(value.playerId) &&
    isFiniteNumber(value.startedAt) &&
    Array.isArray(value.points) &&
    value.points.length > 0 &&
    value.points.every((point) => isPoint(point))
  );
}

export function isClientMessage(value: unknown): value is ClientMessage {
  if (!isRecord(value)) return false;

  switch (value.type) {
    case "create-room":
      return isString(value.imageId);
    case "join-room":
      return isString(value.roomId);
    case "input-frame":
      return (
        isString(value.roomId) &&
        isString(value.playerId) &&
        isPoint(value.direction) &&
        isFiniteNumber(value.sequence)
      );
    case "capture-proposal":
      return (
        isString(value.roomId) &&
        isString(value.playerId) &&
        isTrail(value.trail)
      );
    case "reconnect":
      return isString(value.roomId) && isString(value.playerId);
    default:
      return false;
  }
}

export function isServerMessage(value: unknown): value is ServerMessage {
  if (!isRecord(value)) return false;

  switch (value.type) {
    case "room-created":
      return isString(value.roomId);
    case "room-joined":
      return isString(value.roomId) && isString(value.playerId);
    case "state-sync":
      return (
        isString(value.roomId) &&
        isFiniteNumber(value.stateVersion) &&
        isString(value.imageId) &&
        Array.isArray(value.playerIds) &&
        value.playerIds.length > 0 &&
        value.playerIds.every((playerId) => isString(playerId))
      );
    case "capture-commit":
      return (
        isString(value.roomId) &&
        isString(value.captureId) &&
        isFiniteNumber(value.revealedRatio)
      );
    case "error":
      return isString(value.message);
    default:
      return false;
  }
}

export function makeRoomCreated(roomId: string): ServerMessage {
  return { type: "room-created", roomId };
}
