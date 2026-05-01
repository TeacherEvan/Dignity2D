import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { createAppServer } from "./index";

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

    const uploadResponse = await fetch(`${app.getUrl()}/upload?retention=bogus`, {
      method: "POST",
      headers: { "content-type": "image/png" },
      body: new Uint8Array(pngBuffer),
    });
    expect(uploadResponse.ok).toBe(true);
    const uploaded = (await uploadResponse.json()) as {
      imageId: string;
      imageUrl: string;
      retention: string;
      bytes: number;
    };
    expect(uploaded.imageId).toMatch(/^image-/);
    expect(uploaded.imageUrl).toContain(`/images/${uploaded.imageId}`);
    expect(uploaded.retention).toBe("session");
    expect(uploaded.bytes).toBeGreaterThan(0);

    const imageResponse = await fetch(uploaded.imageUrl);
    expect(imageResponse.ok).toBe(true);
    expect(imageResponse.headers.get("content-type")).toBe("image/webp");
    expect((await imageResponse.arrayBuffer()).byteLength).toBeGreaterThan(0);
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
        socket.send(JSON.stringify({ type: "create-room", imageId: "ws-image" }));
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
});