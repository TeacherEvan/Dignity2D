export const BACKEND_REQUIRED_MESSAGE =
  "Online rooms and uploads require VITE_SERVER_URL in hosted deployments.";

const PLACEHOLDER_SERVER_URL = "https://your-backend.example.com";

type LocationLike = {
  origin: string;
  hostname: string;
};

function isLocalHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0"
  );
}

export function resolveDefaultServerUrl(
  configuredServerUrl = import.meta.env.VITE_SERVER_URL,
  locationLike: LocationLike | null = typeof window === "undefined"
    ? null
    : window.location,
): string | null {
  const localFallback =
    locationLike && isLocalHostname(locationLike.hostname)
      ? "http://127.0.0.1:8787"
      : null;

  if (configuredServerUrl && configuredServerUrl !== PLACEHOLDER_SERVER_URL) {
    return configuredServerUrl;
  }

  if (localFallback) {
    return localFallback;
  }

  return null;
}

export const DEFAULT_SERVER_URL = resolveDefaultServerUrl();

function requireServerUrl(serverUrl = DEFAULT_SERVER_URL): string {
  if (!serverUrl) {
    throw new Error(BACKEND_REQUIRED_MESSAGE);
  }

  return serverUrl;
}

export type RoomCreateResponse = {
  roomId: string;
  playerId: string;
  playerCount: number;
  imageId: string;
  imageUrl: string | null;
  bytes: number | null;
  retention: string | null;
};

export type RoomSession = RoomCreateResponse & {
  stateVersion: number;
};

export type RoomJoinResponse = {
  roomId: string;
  playerId: string;
  playerCount: number;
  imageId: string;
  imageUrl: string | null;
  bytes: number | null;
  retention: string | null;
};

export type UploadedImage = {
  imageId: string;
  imageUrl: string;
  retention: string;
  bytes: number;
};

export function toWebSocketUrl(baseUrl: string): string {
  return baseUrl.replace(/^http/i, "ws");
}

export async function createRoom(
  imageId: string,
  serverUrl = DEFAULT_SERVER_URL,
): Promise<RoomCreateResponse> {
  const activeServerUrl = requireServerUrl(serverUrl);
  const response = await fetch(`${activeServerUrl}/rooms`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ imageId }),
  });

  if (!response.ok) {
    throw new Error("Failed to create room.");
  }

  return (await response.json()) as RoomCreateResponse;
}

export function reconnectRoom(
  roomId: string,
  playerId: string,
  serverUrl = DEFAULT_SERVER_URL,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const activeServerUrl = requireServerUrl(serverUrl);
    const socket = new WebSocket(toWebSocketUrl(activeServerUrl));

    socket.addEventListener("open", () => {
      socket.send(JSON.stringify({ type: "reconnect", roomId, playerId }));
    });

    socket.addEventListener("message", (event) => {
      const payload = JSON.parse(String(event.data)) as
        | { type: "state-sync"; stateVersion: number }
        | { type: "error"; message: string };

      if (payload.type === "error") {
        socket.close();
        reject(new Error(payload.message));
        return;
      }

      socket.close();
      resolve(payload.stateVersion);
    });

    socket.addEventListener("error", () => {
      reject(new Error("Room websocket connection failed."));
    });
  });
}

export async function createRoomSession(
  imageId: string,
  serverUrl = DEFAULT_SERVER_URL,
): Promise<RoomSession> {
  const room = await createRoom(imageId, serverUrl);
  const stateVersion = await reconnectRoom(
    room.roomId,
    room.playerId,
    serverUrl,
  );
  return {
    ...room,
    stateVersion,
  };
}

export async function joinRoom(
  roomId: string,
  serverUrl = DEFAULT_SERVER_URL,
): Promise<RoomJoinResponse> {
  const activeServerUrl = requireServerUrl(serverUrl);
  const response = await fetch(`${activeServerUrl}/rooms/join`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ roomId }),
  });

  if (!response.ok) {
    throw new Error("Failed to join room.");
  }

  return (await response.json()) as RoomJoinResponse;
}

export async function joinRoomSession(
  roomId: string,
  serverUrl = DEFAULT_SERVER_URL,
): Promise<RoomSession> {
  const joined = await joinRoom(roomId, serverUrl);
  const stateVersion = await reconnectRoom(
    joined.roomId,
    joined.playerId,
    serverUrl,
  );

  return {
    ...joined,
    stateVersion,
  };
}

export async function uploadImage(
  file: Blob,
  retention: string,
  serverUrl = DEFAULT_SERVER_URL,
): Promise<UploadedImage> {
  const activeServerUrl = requireServerUrl(serverUrl);
  const response = await fetch(
    `${activeServerUrl}/upload?retention=${encodeURIComponent(retention)}`,
    {
      method: "POST",
      headers: { "content-type": file.type || "application/octet-stream" },
      body: file,
    },
  );

  if (!response.ok) {
    throw new Error("Failed to upload image.");
  }

  return (await response.json()) as UploadedImage;
}
