import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ServerMessage } from "../../shared/protocol";
import {
  RoomClient,
  interpolatePoint,
  shouldPauseRankedScoring,
} from "./RoomClient";

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static OPEN = 1;

  readyState = 0;
  sent: string[] = [];
  private listeners = new Map<string, Set<(event?: unknown) => void>>();

  constructor(public readonly url: string) {
    MockWebSocket.instances.push(this);
  }

  addEventListener(type: string, listener: (event?: unknown) => void) {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener);
    this.listeners.set(type, set);
  }

  removeEventListener(type: string, listener: (event?: unknown) => void) {
    this.listeners.get(type)?.delete(listener);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.readyState = 3;
  }

  emit(type: string, event?: unknown) {
    if (type === "open") {
      this.readyState = MockWebSocket.OPEN;
    }
    this.listeners.get(type)?.forEach((listener) => listener(event));
  }
}

describe("RoomClient", () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
  });

  it("interpolates teammate movement", () => {
    expect(interpolatePoint({ x: 0, y: 0 }, { x: 10, y: 0 }, 0.5)).toEqual({
      x: 5,
      y: 0,
    });
  });

  it("pauses ranked scoring on high latency", () => {
    expect(shouldPauseRankedScoring(351)).toBe(true);
    expect(shouldPauseRankedScoring(120)).toBe(false);
  });

  it("connects and sends a reconnect message on open", () => {
    const client = new RoomClient({
      roomId: "room-1",
      playerId: "p1",
      serverUrl: "http://example.test",
      WebSocketImpl: MockWebSocket as never,
    });

    client.connect();
    const socket = MockWebSocket.instances[0]!;
    socket.emit("open");

    expect(socket.url).toBe("ws://example.test");
    expect(socket.sent).toEqual([
      JSON.stringify({ type: "reconnect", roomId: "room-1", playerId: "p1" }),
    ]);
  });

  it("sends input frames and capture proposals over the active socket", () => {
    const client = new RoomClient({
      roomId: "room-1",
      playerId: "p1",
      serverUrl: "http://example.test",
      WebSocketImpl: MockWebSocket as never,
    });

    client.connect();
    const socket = MockWebSocket.instances[0]!;
    socket.emit("open");

    client.sendInputFrame({ x: 1, y: 0 }, 4);
    client.sendCaptureProposal({
      playerId: "p1",
      startedAt: 9,
      points: [{ x: 0, y: 0 }],
    });

    expect(socket.sent.slice(1)).toEqual([
      JSON.stringify({
        type: "input-frame",
        roomId: "room-1",
        playerId: "p1",
        direction: { x: 1, y: 0 },
        sequence: 4,
      }),
      JSON.stringify({
        type: "capture-proposal",
        roomId: "room-1",
        playerId: "p1",
        trail: {
          playerId: "p1",
          startedAt: 9,
          points: [{ x: 0, y: 0 }],
        },
      }),
    ]);
  });

  it("forwards valid server messages and rejects malformed payloads", () => {
    const onMessage = vi.fn<(message: ServerMessage) => void>();
    const onError = vi.fn<(error: Error) => void>();
    const client = new RoomClient({
      roomId: "room-1",
      playerId: "p1",
      serverUrl: "http://example.test",
      WebSocketImpl: MockWebSocket as never,
      onMessage,
      onError,
    });

    client.connect();
    const socket = MockWebSocket.instances[0]!;
    socket.emit("message", {
      data: JSON.stringify({ type: "state-sync", roomId: "room-1", stateVersion: 3 }),
    });
    socket.emit("message", {
      data: JSON.stringify({ type: "state-sync", roomId: "room-1" }),
    });

    expect(onMessage).toHaveBeenCalledWith({
      type: "state-sync",
      roomId: "room-1",
      stateVersion: 3,
    });
    expect(onError).toHaveBeenCalledWith(new Error("Malformed server message."));
  });
});
