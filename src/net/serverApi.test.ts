import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BACKEND_REQUIRED_MESSAGE,
  createRoom,
  createRoomSession,
  joinRoom,
  joinRoomSession,
  reconnectRoom,
  resolveDefaultServerUrl,
  toWebSocketUrl,
  uploadImage,
} from "./serverApi";

const fetchMock = vi.fn();

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static OPEN = 1;

  private listeners = new Map<string, Array<(event?: unknown) => void>>();
  readyState = 0;

  constructor(public readonly url: string) {
    MockWebSocket.instances.push(this);
  }

  addEventListener(type: string, listener: (event?: unknown) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  removeEventListener(type: string, listener: (event?: unknown) => void): void {
    this.listeners.set(
      type,
      (this.listeners.get(type) ?? []).filter((entry) => entry !== listener),
    );
  }

  send(_data: string): void {}

  close(): void {}

  emit(type: string, event?: unknown): void {
    if (type === "open") {
      this.readyState = MockWebSocket.OPEN;
    }
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

vi.stubGlobal("fetch", fetchMock);
vi.stubGlobal("WebSocket", MockWebSocket as unknown as typeof WebSocket);

afterEach(() => {
  fetchMock.mockReset();
  MockWebSocket.instances = [];
});

describe("serverApi", () => {
  it("uses the configured hosted backend when provided", () => {
    expect(
      resolveDefaultServerUrl("https://api.example.test", {
        origin: "https://app.example.test",
        hostname: "app.example.test",
      }),
    ).toBe("https://api.example.test");
  });

  it("falls back to the local backend during local development", () => {
    expect(
      resolveDefaultServerUrl(undefined, {
        origin: "http://localhost:5173",
        hostname: "localhost",
      }),
    ).toBe("http://127.0.0.1:8787");
  });

  it("ignores the placeholder backend URL during local development", () => {
    expect(
      resolveDefaultServerUrl("https://your-backend.example.com", {
        origin: "http://127.0.0.1:5173",
        hostname: "127.0.0.1",
      }),
    ).toBe("http://127.0.0.1:8787");
  });

  it("returns null for hosted builds without an explicit backend", () => {
    expect(
      resolveDefaultServerUrl(undefined, {
        origin: "https://dignity-arcade.vercel.app",
        hostname: "dignity-arcade.vercel.app",
      }),
    ).toBeNull();
  });

  it("throws a clear error when hosted backend features are unavailable", async () => {
    await expect(createRoom("img-1", null as never)).rejects.toThrow(
      BACKEND_REQUIRED_MESSAGE,
    );
  });

  it("creates rooms over HTTP", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        roomId: "room-1",
        playerId: "p1",
        playerCount: 1,
        imageId: "img-1",
        imagePath: null,
        bytes: null,
        retention: null,
      }),
    });

    await expect(
      createRoom("img-1", "http://example.test"),
    ).resolves.toMatchObject({
      roomId: "room-1",
      playerId: "p1",
    });
  });

  it("reconnects room state over websocket", async () => {
    const pending = reconnectRoom("room-1", "p1", "http://example.test");
    const socket = MockWebSocket.instances[0]!;
    socket.emit("open");
    socket.emit("message", {
      data: JSON.stringify({ type: "state-sync", roomId: "room-1", stateVersion: 3 }),
    });

    await expect(pending).resolves.toBe(3);
    expect(socket.url).toBe("ws://example.test");
  });

  it("creates a room session by combining HTTP and websocket state sync", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        roomId: "room-2",
        playerId: "p2",
        playerCount: 1,
        imageId: "img-2",
        imagePath: "/images/image-2?token=token-2",
        bytes: 12,
        retention: "session",
      }),
    });

    const pending = createRoomSession("img-2", "http://example.test");
    await new Promise((resolve) => setTimeout(resolve, 0));
    const socket = MockWebSocket.instances[0]!;
    socket.emit("open");
    socket.emit("message", {
      data: JSON.stringify({ type: "state-sync", roomId: "room-2", stateVersion: 5 }),
    });

    await expect(pending).resolves.toMatchObject({
      roomId: "room-2",
      stateVersion: 5,
    });
  });

  it("uploads image blobs over HTTP", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        imageId: "image-1",
        imagePath: "/images/image-1?token=token-1",
        retention: "14-days",
        bytes: 3,
      }),
    });

    const result = await uploadImage(
      new Blob([new Uint8Array([9, 8, 7])], { type: "image/png" }),
      "14-days",
      "http://example.test",
    );

    expect(result.retention).toBe("14-days");
    expect(result.bytes).toBe(3);
    expect(result.imageUrl).toBe(
      "http://example.test/images/image-1?token=token-1",
    );
  });

  it("joins rooms over HTTP", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        roomId: "room-8",
        playerId: "p2",
        playerCount: 2,
        imageId: "image-8",
        imagePath: "/images/image-8?token=token-8",
        bytes: 44,
        retention: "session",
      }),
    });

    await expect(
      joinRoom("room-8", "http://example.test"),
    ).resolves.toMatchObject({
      roomId: "room-8",
      playerId: "p2",
    });
  });

  it("creates a joined room session by combining HTTP join and websocket sync", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        roomId: "room-9",
        playerId: "p2",
        playerCount: 2,
        imageId: "image-9",
        imagePath: "/images/image-9?token=token-9",
        bytes: 55,
        retention: "session",
      }),
    });

    const pending = joinRoomSession("room-9", "http://example.test");
    await new Promise((resolve) => setTimeout(resolve, 0));
    const socket = MockWebSocket.instances[0]!;
    socket.emit("open");
    socket.emit("message", {
      data: JSON.stringify({ type: "state-sync", roomId: "room-9", stateVersion: 7 }),
    });

    await expect(pending).resolves.toMatchObject({
      roomId: "room-9",
      playerId: "p2",
      stateVersion: 7,
    });
  });

  it("surfaces backend join errors from the response body", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Room not found or full." }),
    });

    await expect(joinRoom("room-missing", "http://example.test")).rejects.toThrow(
      "Room not found or full.",
    );
  });

  it("converts http URLs to websocket URLs", () => {
    expect(toWebSocketUrl("http://127.0.0.1:8787")).toBe("ws://127.0.0.1:8787");
    expect(toWebSocketUrl("https://example.test")).toBe("wss://example.test");
  });
});
