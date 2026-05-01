import { createServer } from "node:http";
import { Buffer } from "node:buffer";
import { WebSocketServer } from "ws";
import { isClientMessage, makeRoomCreated } from "../shared/protocol";
import { RoomManager } from "./rooms/RoomManager";
import { normalizeRetention, buildUploadPolicy } from "./upload/processImage";
import { transformImage } from "./upload/transformImage";
function writeJson(response, statusCode, body) {
    response.writeHead(statusCode, { "content-type": "application/json" });
    response.end(JSON.stringify(body));
}
function readBody(request) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        request.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        request.on("end", () => resolve(Buffer.concat(chunks)));
        request.on("error", reject);
    });
}
async function readJsonBody(request) {
    const raw = await readBody(request);
    if (raw.length === 0) {
        return {};
    }
    return JSON.parse(raw.toString("utf8"));
}
function sendSocketMessage(socket, message) {
    socket.send(JSON.stringify(message));
}
export function createAppServer() {
    const roomManager = new RoomManager();
    const httpServer = createServer(async (request, response) => {
        const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
        if (request.method === "GET" && requestUrl.pathname === "/health") {
            writeJson(response, 200, { ok: true, rooms: 0 });
            return;
        }
        if (request.method === "POST" && requestUrl.pathname === "/rooms") {
            const body = await readJsonBody(request);
            const imageId = typeof body.imageId === "string" ? body.imageId : "default-image";
            const room = roomManager.createRoom(imageId);
            writeJson(response, 201, {
                roomId: room.id,
                imageId: room.imageId,
                playerId: room.players[0]?.id ?? null,
                playerCount: room.players.length,
            });
            return;
        }
        if (request.method === "POST" && requestUrl.pathname === "/rooms/join") {
            const body = await readJsonBody(request);
            const roomId = typeof body.roomId === "string" ? body.roomId : "";
            const room = roomManager.joinRoom(roomId);
            if (!room) {
                writeJson(response, 404, { error: "Room not found or full." });
                return;
            }
            writeJson(response, 200, {
                roomId: room.id,
                playerId: room.players[room.players.length - 1]?.id ?? null,
                playerCount: room.players.length,
            });
            return;
        }
        if (request.method === "POST" && requestUrl.pathname === "/upload") {
            const retention = normalizeRetention(requestUrl.searchParams.get("retention") ?? "session");
            const policy = buildUploadPolicy(retention);
            const source = await readBody(request);
            if (source.length === 0) {
                writeJson(response, 400, { error: "Upload body is empty." });
                return;
            }
            const output = await transformImage(source, policy);
            response.writeHead(200, {
                "content-type": "image/webp",
                "cache-control": "private, max-age=0, must-revalidate",
                "x-retention": retention,
                "content-length": output.length,
            });
            response.end(output);
            return;
        }
        writeJson(response, 404, { error: "Not found." });
    });
    const webSocketServer = new WebSocketServer({ server: httpServer });
    webSocketServer.on("connection", (socket) => {
        socket.on("message", (message) => {
            let parsed;
            try {
                parsed = JSON.parse(message.toString());
            }
            catch {
                sendSocketMessage(socket, { type: "error", message: "Invalid JSON payload." });
                return;
            }
            if (!isClientMessage(parsed)) {
                sendSocketMessage(socket, { type: "error", message: "Unsupported message." });
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
                        sendSocketMessage(socket, { type: "error", message: "Room not found or full." });
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
                        sendSocketMessage(socket, { type: "error", message: "Room not found." });
                        return;
                    }
                    sendSocketMessage(socket, {
                        type: "state-sync",
                        roomId: room.id,
                        stateVersion: room.stateVersion,
                    });
                    return;
                }
                case "input-frame":
                case "capture-proposal": {
                    const room = roomManager.getRoom(parsed.roomId);
                    if (!room) {
                        sendSocketMessage(socket, { type: "error", message: "Room not found." });
                        return;
                    }
                    sendSocketMessage(socket, {
                        type: "state-sync",
                        roomId: room.id,
                        stateVersion: room.stateVersion,
                    });
                    return;
                }
            }
        });
    });
    return {
        roomManager,
        async listen(port = 0) {
            await new Promise((resolve) => httpServer.listen(port, "127.0.0.1", () => resolve()));
            const address = httpServer.address();
            if (!address || typeof address === "string") {
                throw new Error("Server did not bind to a TCP port.");
            }
            return address.port;
        },
        async close() {
            await new Promise((resolve, reject) => {
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
        getUrl() {
            const address = httpServer.address();
            if (!address || typeof address === "string") {
                return "http://127.0.0.1";
            }
            return `http://127.0.0.1:${address.port}`;
        },
    };
}
