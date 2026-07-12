import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { Buffer } from "node:buffer";
import { WebSocketServer } from "ws";
import {
  isClientMessage,
  makeRoomCreated,
  type ServerMessage,
} from "../shared/protocol";
import { ImageStore } from "./ImageStore";
import { RoomManager } from "./rooms/RoomManager";
import {
  MAX_UPLOAD_BYTES,
  normalizeRetention,
  buildUploadPolicy,
} from "./upload/processImage";
import { transformImage } from "./upload/transformImage";

type JsonValue = Record<string, unknown>;

const MAX_JSON_BYTES = 8 * 1024;
const MAX_WS_MESSAGE_BYTES = 64 * 1024;

const ALLOWED_CORS_ORIGINS = new Set<string>([
  "http://localhost",
  "http://127.0.0.1",
  "https://dignity.example.com",
  "https://dignity2-d.vercel.app",
  "https://dignity2-d-git-main-teacher-evans-projects.vercel.app",
  ...(process.env.ALLOWED_CORS_ORIGINS
    ? process.env.ALLOWED_CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
    : []),
]);

function isAllowedCorsOrigin(origin: string | null | undefined): boolean {
  if (!origin) return false;
  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    if (ALLOWED_CORS_ORIGINS.has(origin)) return true;
    // Match any localhost / 127.0.0.1 origin on any port (local dev).
    return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function resolveCorsHeaders(request: IncomingMessage): Record<string, string> {
  const origin = request.headers.origin ?? null;
  if (!isAllowedCorsOrigin(origin)) {
    return {};
  }
  return {
    "access-control-allow-origin": origin as string,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
    Vary: "origin",
  };
}

function withCors(
  request: IncomingMessage,
  headers: Record<string, string>,
): Record<string, string> {
  return { ...resolveCorsHeaders(request), ...headers };
}

export type AppServer = {
  roomManager: RoomManager;
  listen: (port?: number) => Promise<number>;
  close: () => Promise<void>;
  getUrl: () => string;
};

function buildSignedImagePath(imageId: string, accessToken: string): string {
  return `/images/${imageId}?token=${accessToken}`;
}

function buildImageMetadata(
  imageStore: ImageStore,
  imageId: string,
): {
  imageId: string;
  imagePath: string | null;
  bytes: number | null;
  retention: string | null;
} {
  const stored = imageStore.get(imageId);
  if (!stored) {
    return {
      imageId,
      imagePath: null,
      bytes: null,
      retention: null,
    };
  }

  return {
    imageId,
    imagePath: buildSignedImagePath(stored.id, stored.accessToken),
    bytes: stored.bytes,
    retention: stored.retention,
  };
}

function writeJson(
  request: IncomingMessage,
  response: ServerResponse,
  statusCode: number,
  body: JsonValue,
): void {
  response.writeHead(statusCode, {
    ...withCors(request, {}),
    "content-type": "application/json",
  });
  response.end(JSON.stringify(body));
}

class RequestTooLargeError extends Error {
  constructor(readonly clientMessage: string) {
    super(clientMessage);
  }
}

function readBody(
  request: IncomingMessage,
  maxBytes = Number.POSITIVE_INFINITY,
  clientMessage = "Request body exceeds size limit.",
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    let exceededLimit = false;

    request.on("data", (chunk) => {
      if (exceededLimit) {
        return;
      }

      const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalBytes += bufferChunk.length;
      if (totalBytes > maxBytes) {
        exceededLimit = true;
        reject(new RequestTooLargeError(clientMessage));
        return;
      }
      chunks.push(bufferChunk);
    });
    request.on("end", () => {
      if (!exceededLimit) {
        resolve(Buffer.concat(chunks));
      }
    });
    request.on("error", reject);
  });
}

async function readJsonBody(request: IncomingMessage): Promise<JsonValue> {
  const raw = await readBody(
    request,
    MAX_JSON_BYTES,
    "Request body exceeds size limit.",
  );
  if (raw.length === 0) {
    return {};
  }
  return JSON.parse(raw.toString("utf8")) as JsonValue;
}

function sendSocketMessage(
  socket: { send: (data: string) => void },
  message: ServerMessage,
): void {
  socket.send(JSON.stringify(message));
}

export function createAppServer(): AppServer {
  const roomManager = new RoomManager();
  const imageStore = new ImageStore();
  const httpServer = createServer(async (request, response) => {
    const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");

    try {
      if (request.method === "OPTIONS") {
        response.writeHead(204, resolveCorsHeaders(request));
        response.end();
        return;
      }

      if (request.method === "GET" && requestUrl.pathname === "/health") {
        writeJson(request, response, 200, { ok: true, rooms: 0 });
        return;
      }

      if (
        request.method === "GET" &&
        requestUrl.pathname.startsWith("/images/")
      ) {
        const imageId = requestUrl.pathname.replace("/images/", "");
        const token = requestUrl.searchParams.get("token") ?? "";
        const stored = imageStore.getAuthorized(imageId, token);
        if (!stored) {
          writeJson(request, response, 404, { error: "Image not found." });
          return;
        }
        response.writeHead(200, {
          ...withCors(request, {
            "content-type": stored.contentType,
            "cache-control": "private, max-age=0, must-revalidate",
            "content-length": String(stored.bytes),
          }),
        });
        response.end(stored.buffer);
        return;
      }

      if (request.method === "POST" && requestUrl.pathname === "/rooms") {
        const body = await readJsonBody(request);
        const imageId =
          typeof body.imageId === "string" ? body.imageId : "default-image";
        const room = roomManager.createRoom(imageId);
        const image = buildImageMetadata(imageStore, room.imageId);
        writeJson(request, response, 201, {
          roomId: room.id,
          playerId: room.players[0]?.id ?? null,
          playerCount: room.players.length,
          ...image,
        });
        return;
      }

      if (request.method === "POST" && requestUrl.pathname === "/rooms/join") {
        const body = await readJsonBody(request);
        const roomId = typeof body.roomId === "string" ? body.roomId : "";
        const room = roomManager.joinRoom(roomId);
        if (!room) {
          writeJson(request, response, 404, {
            error: "Room not found or full.",
          });
          return;
        }
        const image = buildImageMetadata(imageStore, room.imageId);
        writeJson(request, response, 200, {
          roomId: room.id,
          playerId: room.players[room.players.length - 1]?.id ?? null,
          playerCount: room.players.length,
          ...image,
        });
        return;
      }

      if (request.method === "POST" && requestUrl.pathname === "/upload") {
        const retention = normalizeRetention(
          requestUrl.searchParams.get("retention") ?? "session",
        );
        const policy = buildUploadPolicy(retention);
        const source = await readBody(
          request,
          MAX_UPLOAD_BYTES,
          "Upload exceeds server size limit.",
        );
        if (source.length === 0) {
          writeJson(request, response, 400, { error: "Upload body is empty." });
          return;
        }

        let output: Buffer;
        try {
          output = await transformImage(source, policy);
        } catch {
          writeJson(request, response, 400, {
            error: "Upload image could not be processed.",
          });
          return;
        }

        const stored = imageStore.save(output, retention);
        writeJson(request, response, 200, {
          imageId: stored.id,
          imagePath: buildSignedImagePath(stored.id, stored.accessToken),
          retention,
          bytes: stored.bytes,
        });
        return;
      }

      writeJson(request, response, 404, { error: "Not found." });
    } catch (error) {
      if (error instanceof RequestTooLargeError) {
        writeJson(request, response, 413, { error: error.clientMessage });
        return;
      }
      writeJson(request, response, 500, { error: "Internal server error." });
    }
  });

  const webSocketServer = new WebSocketServer({ server: httpServer });
  webSocketServer.on("connection", (socket) => {
    socket.on("message", (message) => {
      // Guard on the size of THIS message only. The previous cumulative
      // counter killed healthy connections after ~64 KiB of normal traffic
      // (every input-frame adds bytes), which froze networked games.
      const frameBytes =
        typeof message === "string"
          ? Buffer.byteLength(message)
          : Buffer.isBuffer(message)
            ? message.length
            : message instanceof ArrayBuffer
              ? message.byteLength
              : (message as Buffer[]).reduce(
                  (total, chunk) => total + chunk.length,
                  0,
                );

      if (frameBytes > MAX_WS_MESSAGE_BYTES) {
        sendSocketMessage(socket, {
          type: "error",
          message: "Message size limit exceeded.",
        });
        socket.close();
        return;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(message.toString());
      } catch {
        sendSocketMessage(socket, {
          type: "error",
          message: "Invalid JSON payload.",
        });
        return;
      }

      if (!isClientMessage(parsed)) {
        sendSocketMessage(socket, {
          type: "error",
          message: "Unsupported message.",
        });
        return;
      }

      switch (parsed.type) {
        case "create-room": {
          const room = roomManager.createRoom(parsed.imageId);
          sendSocketMessage(socket, makeRoomCreated(room.id));
          return;
        }
        case "join-room": {
          const room = roomManager.joinRoom(parsed.roomId);
          if (!room) {
            sendSocketMessage(socket, {
              type: "error",
              message: "Room not found or full.",
            });
            return;
          }
          sendSocketMessage(socket, {
            type: "room-joined",
            roomId: room.id,
            playerId: room.players[room.players.length - 1]?.id ?? "",
          });
          return;
        }
        case "reconnect": {
          const room = roomManager.getRoom(parsed.roomId);
          if (!room) {
            sendSocketMessage(socket, {
              type: "error",
              message: "Room not found.",
            });
            return;
          }
          sendSocketMessage(socket, {
            type: "state-sync",
            roomId: room.id,
            stateVersion: room.stateVersion,
            imageId: room.imageId,
            playerIds: room.players.map((player) => player.id),
          });
          return;
        }
        case "input-frame":
        case "capture-proposal": {
          const room = roomManager.getRoom(parsed.roomId);
          if (!room) {
            sendSocketMessage(socket, {
              type: "error",
              message: "Room not found.",
            });
            return;
          }
          sendSocketMessage(socket, {
            type: "state-sync",
            roomId: room.id,
            stateVersion: room.stateVersion,
            imageId: room.imageId,
            playerIds: room.players.map((player) => player.id),
          });
          return;
        }
      }
    });
  });

  return {
    roomManager,
    async listen(port = 0): Promise<number> {
      await new Promise<void>((resolve) =>
        httpServer.listen(port, "127.0.0.1", () => resolve()),
      );
      const address = httpServer.address();
      if (!address || typeof address === "string") {
        throw new Error("Server did not bind to a TCP port.");
      }
      return address.port;
    },
    async close(): Promise<void> {
      imageStore.dispose();
      await new Promise<void>((resolve, reject) => {
        webSocketServer.close((socketError) => {
          if (socketError) {
            reject(socketError);
            return;
          }
          httpServer.close((serverError) => {
            if (serverError) {
              reject(serverError);
              return;
            }
            resolve();
          });
        });
      });
    },
    getUrl(): string {
      const address = httpServer.address();
      if (!address || typeof address === "string") {
        return "http://127.0.0.1";
      }
      return `http://127.0.0.1:${address.port}`;
    },
  };
}
