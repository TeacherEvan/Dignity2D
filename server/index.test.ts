import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { createAppServer } from "./index";
import { MAX_UPLOAD_BYTES } from "./upload/processImage";

const activeServers: Array<ReturnType<typeof createAppServer>> = [];

afterEach(async () => {
  while (activeServers.length > 0) {
    await activeServers.pop()!.close();
  }
});

describe("server entrypoint", () => {
  it("serves health, rooms, and upload endpoints", async () => {
    const app = createAppServer();
    activeServers.push(app);
    await app.listen();

    const healthResponse = await fetch(`${app.getUrl()}/health`);
    expect(healthResponse.ok).toBe(true);
    await expect(healthResponse.json()).resolves.toMatchObject({ ok: true });

    const createRoomResponse = await fetch(`${app.getUrl()}/rooms`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ imageId: "img-1" }),
    });
    expect(createRoomResponse.status).toBe(201);
    const room = (await createRoomResponse.json()) as { roomId: string };
    expect(room.roomId).toMatch(/^room-/);

    const joinRoomResponse = await fetch(`${app.getUrl()}/rooms/join`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ roomId: room.roomId }),
    });
    expect(joinRoomResponse.ok).toBe(true);

    const pngBuffer = await sharp({
      create: {
        width: 4,
        height: 4,
        channels: 3,
        background: { r: 255, g: 200, b: 0 },
      },
    })
      .png()
      .toBuffer();

    const uploadResponse = await fetch(
      `${app.getUrl()}/upload?retention=bogus`,
      {
        method: "POST",
        headers: { "content-type": "image/png" },
        body: new Uint8Array(pngBuffer),
      },
    );
    expect(uploadResponse.ok).toBe(true);
    const uploaded = (await uploadResponse.json()) as {
      imageId: string;
      imagePath: string;
      retention: string;
      bytes: number;
    };
    expect(uploaded.imageId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(uploaded.imagePath).toContain(`/images/${uploaded.imageId}`);
    expect(
      new URL(uploaded.imagePath, app.getUrl()).searchParams.get("token"),
    ).toBeTruthy();
    expect(uploaded.retention).toBe("session");
    expect(uploaded.bytes).toBeGreaterThan(0);
    expect(Object.hasOwn(uploaded, "imageUrl")).toBe(false);

    const imageUrl = new URL(uploaded.imagePath, app.getUrl()).toString();
    const imageResponse = await fetch(imageUrl);
    expect(imageResponse.ok).toBe(true);
    expect(imageResponse.headers.get("content-type")).toBe("image/webp");
    expect((await imageResponse.arrayBuffer()).byteLength).toBeGreaterThan(0);

    const deniedUrl = new URL(imageUrl);
    deniedUrl.searchParams.set("token", "wrong-token");
    const deniedResponse = await fetch(deniedUrl);
    expect(deniedResponse.status).toBe(404);
  });

  it("rejects oversized upload bodies before processing", async () => {
    const app = createAppServer();
    activeServers.push(app);
    await app.listen();

    const oversizedResponse = await fetch(`${app.getUrl()}/upload`, {
      method: "POST",
      headers: { "content-type": "application/octet-stream" },
      body: new Uint8Array(MAX_UPLOAD_BYTES + 1),
    });

    expect(oversizedResponse.status).toBe(413);
    await expect(oversizedResponse.json()).resolves.toEqual({
      error: "Upload exceeds server size limit.",
    });
  });

  it("rejects oversized JSON room requests with a generic size-limit error", async () => {
    const app = createAppServer();
    activeServers.push(app);
    await app.listen();

    const oversizedResponse = await fetch(`${app.getUrl()}/rooms`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ imageId: "x".repeat(9000) }),
    });

    expect(oversizedResponse.status).toBe(413);
    await expect(oversizedResponse.json()).resolves.toEqual({
      error: "Request body exceeds size limit.",
    });
  });

  it("responds over websocket for invalid and valid room messages", async () => {
    const app = createAppServer();
    activeServers.push(app);
    await app.listen();

    const received: Array<{ type: string; [key: string]: unknown }> = [];
    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(app.getUrl().replace("http", "ws"));

      socket.once("open", () => {
        socket.send("not-json");
        socket.send(
          JSON.stringify({ type: "create-room", imageId: "ws-image" }),
        );
      });

      socket.on("message", (message) => {
        received.push(JSON.parse(message.toString()) as { type: string });
        if (received.length === 2) {
          socket.close();
          resolve();
        }
      });

      socket.once("error", reject);
    });

    expect(received[0]?.type).toBe("error");
    expect(received[1]?.type).toBe("room-created");
  });

  it("returns websocket errors for missing reconnect rooms", async () => {
    const app = createAppServer();
    activeServers.push(app);
    await app.listen();

    const received = await new Promise<{ type: string; message?: string }>(
      (resolve, reject) => {
        const socket = new WebSocket(app.getUrl().replace("http", "ws"));
        socket.once("open", () => {
          socket.send(
            JSON.stringify({
              type: "reconnect",
              roomId: "missing",
              playerId: "p1",
            }),
          );
        });
        socket.once("message", (message) => {
          socket.close();
          resolve(
            JSON.parse(message.toString()) as {
              type: string;
              message?: string;
            },
          );
        });
        socket.once("error", reject);
      },
    );

    expect(received).toEqual({ type: "error", message: "Room not found." });
  });

  it("rejects websocket payloads that only match the type discriminator", async () => {
    const app = createAppServer();
    activeServers.push(app);
    await app.listen();

    const received = await new Promise<{ type: string; message?: string }>(
      (resolve, reject) => {
        const socket = new WebSocket(app.getUrl().replace("http", "ws"));
        socket.once("open", () => {
          socket.send(JSON.stringify({ type: "create-room" }));
        });
        socket.once("message", (message) => {
          socket.close();
          resolve(
            JSON.parse(message.toString()) as {
              type: string;
              message?: string;
            },
          );
        });
        socket.once("error", reject);
      },
    );

    expect(received).toEqual({
      type: "error",
      message: "Unsupported message.",
    });
  });

  it("keeps a connection open across many small frames (per-message, not cumulative limit)", async () => {
    const app = createAppServer();
    activeServers.push(app);
    await app.listen();

    // Create a real room so reconnect frames resolve to state-sync.
    const roomResponse = await fetch(`${app.getUrl()}/rooms`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ imageId: "per-msg-img" }),
    });
    const room = (await roomResponse.json()) as { roomId: string };

    const outcome = await new Promise<{
      closed: boolean;
      lastSync: { type: string } | undefined;
    }>((resolve, reject) => {
      const socket = new WebSocket(app.getUrl().replace("http", "ws"));
      const seen: Array<{ type: string }> = [];
      socket.once("open", () => {
        // Many small reconnect frames must NOT trip a cumulative byte cap.
        for (let index = 0; index < 5000; index += 1) {
          socket.send(
            JSON.stringify({
              type: "reconnect",
              roomId: room.roomId,
              playerId: "p1",
            }),
          );
        }
      });
      socket.on("message", (message) => {
        seen.push(JSON.parse(message.toString()) as { type: string });
        if (seen.length >= 5000) {
          socket.close();
          resolve({ closed: true, lastSync: seen[seen.length - 1] });
        }
      });
      socket.once("error", reject);
    });

    expect(outcome.closed).toBe(true);
    // All 5000 frames were processed; none triggered a size-limit kill.
    expect(outcome.lastSync?.type).toBe("state-sync");
  });

  it("closes the websocket when a single message exceeds the per-message limit", async () => {
    const app = createAppServer();
    activeServers.push(app);
    await app.listen();

    const outcome = await new Promise<{
      closed: boolean;
      error?: { type: string; message?: string };
    }>((resolve, reject) => {
      const socket = new WebSocket(app.getUrl().replace("http", "ws"));
      let error: { type: string; message?: string } | undefined;
      socket.once("open", () => {
        // A single oversized message (well above 64 KiB) must be rejected.
        socket.send(
          JSON.stringify({
            type: "reconnect",
            roomId: "x".repeat(200_000),
            playerId: "p1",
          }),
        );
      });
      socket.on("message", (message) => {
        error = JSON.parse(message.toString()) as {
          type: string;
          message?: string;
        };
      });
      socket.once("close", () => resolve({ closed: true, error }));
      socket.once("error", reject);
    });

    expect(outcome.closed).toBe(true);
    expect(outcome.error).toMatchObject({
      type: "error",
      message: "Message size limit exceeded.",
    });
  });

  it("reflects a localhost origin instead of wildcard CORS", async () => {
    const app = createAppServer();
    activeServers.push(app);
    await app.listen();

    const response = await fetch(`${app.getUrl()}/health`, {
      headers: { origin: "http://localhost:4173" },
    });
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "http://localhost:4173",
    );
    expect(response.headers.get("vary")).toContain("origin");
  });

  it("reflects a configured server origin and omits allow-origin for unknown origins", async () => {
    const app = createAppServer();
    activeServers.push(app);
    await app.listen();

    const good = await fetch(`${app.getUrl()}/health`, {
      headers: { origin: "https://dignity.example.com" },
    });
    expect(good.headers.get("access-control-allow-origin")).toBe(
      "https://dignity.example.com",
    );

    const unknown = await fetch(`${app.getUrl()}/health`, {
      headers: { origin: "https://evil.example.com" },
    });
    expect(unknown.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("answers CORS preflight (OPTIONS) with reflected origin", async () => {
    const app = createAppServer();
    activeServers.push(app);
    await app.listen();

    const response = await fetch(`${app.getUrl()}/health`, {
      method: "OPTIONS",
      headers: { origin: "http://127.0.0.1:4173" },
    });
    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "http://127.0.0.1:4173",
    );
  });
});
