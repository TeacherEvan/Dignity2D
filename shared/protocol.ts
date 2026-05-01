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
  | { type: "state-sync"; roomId: string; stateVersion: number }
  | {
      type: "capture-commit";
      roomId: string;
      captureId: string;
      revealedRatio: number;
    }
  | { type: "error"; message: string };

export function isClientMessage(value: unknown): value is ClientMessage {
  if (!value || typeof value !== "object") return false;
  const type = (value as { type?: unknown }).type;
  return (
    type === "create-room" ||
    type === "join-room" ||
    type === "input-frame" ||
    type === "capture-proposal" ||
    type === "reconnect"
  );
}

export function makeRoomCreated(roomId: string): ServerMessage {
  return { type: "room-created", roomId };
}
