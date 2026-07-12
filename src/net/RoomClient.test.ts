import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
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
      data: JSON.stringify({
        type: "state-sync",
        roomId: "room-1",
        stateVersion: 3,
        imageId: "img-1",
        playerIds: ["p1", "p2"],
      }),
    });
    socket.emit("message", {
      data: JSON.stringify({ type: "state-sync", roomId: "room-1" }),
    });

    expect(onMessage).toHaveBeenCalledWith({
      type: "state-sync",
      roomId: "room-1",
      stateVersion: 3,
      imageId: "img-1",
      playerIds: ["p1", "p2"],
    });
    expect(onError).toHaveBeenCalledWith(
      new Error("Malformed server message."),
    );
  });

  it("reconnects with backoff when the socket closes unexpectedly", () => {
    const onError = vi.fn<(error: Error) => void>();
    const client = new RoomClient({
      roomId: "room-1",
      playerId: "p1",
      serverUrl: "http://example.test",
      WebSocketImpl: MockWebSocket as never,
      onError,
      maxReconnectAttempts: 3,
    });

    client.connect();
    const first = MockWebSocket.instances[0]!;
    first.emit("open");
    expect(first.sent).toEqual([
      JSON.stringify({ type: "reconnect", roomId: "room-1", playerId: "p1" }),
    ]);

    // Simulate an unexpected drop.
    first.emit("close");
    expect(MockWebSocket.instances).toHaveLength(1);

    // First reconnect attempt fires after 1000ms backoff.
    vi.advanceTimersByTime(1000);
    const second = MockWebSocket.instances[1];
    expect(second).toBeDefined();
    second.emit("open");
    expect(second.sent).toEqual([
      JSON.stringify({ type: "reconnect", roomId: "room-1", playerId: "p1" }),
    ]);

    client.close();
    expect(onError).not.toHaveBeenCalled();
  });

  it("gives up after exceeding max reconnect attempts and reports the loss", () => {
    const onError = vi.fn<(error: Error) => void>();
    const client = new RoomClient({
      roomId: "room-1",
      playerId: "p1",
      serverUrl: "http://example.test",
      WebSocketImpl: MockWebSocket as never,
      onError,
      maxReconnectAttempts: 2,
    });

    client.connect();
    const first = MockWebSocket.instances[0]!;
    first.emit("open");
    first.emit("close");

    vi.advanceTimersByTime(1000);
    MockWebSocket.instances[1]!.emit("close");
    vi.advanceTimersByTime(2000);
    MockWebSocket.instances[2]!.emit("close");
    vi.advanceTimersByTime(4000);

    expect(onError).toHaveBeenCalledWith(new Error("Room connection lost."));
    expect(MockWebSocket.instances).toHaveLength(3);
  });

  it("does not reconnect when closed by the user", () => {
    const client = new RoomClient({
      roomId: "room-1",
      playerId: "p1",
      serverUrl: "http://example.test",
      WebSocketImpl: MockWebSocket as never,
    });

    client.connect();
    const first = MockWebSocket.instances[0]!;
    first.emit("open");
    client.close();
    first.emit("close");

    vi.advanceTimersByTime(10000);
    expect(MockWebSocket.instances).toHaveLength(1);
  });
});
