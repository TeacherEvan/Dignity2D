import type { Point, Trail } from "../game/types";
import type { ClientMessage, ServerMessage } from "../../shared/protocol";
import { isServerMessage } from "../../shared/protocol";

type WebSocketLike = Pick<
  WebSocket,
  "addEventListener" | "removeEventListener" | "send" | "close" | "readyState"
>;

type WebSocketConstructor = new (url: string) => WebSocketLike;

export type RoomClientOptions = {
  roomId: string;
  playerId: string;
  serverUrl: string;
  WebSocketImpl?: WebSocketConstructor;
  onMessage?: (message: ServerMessage) => void;
  onError?: (error: Error) => void;
  maxReconnectAttempts?: number;
};

function toWebSocketUrl(baseUrl: string): string {
  return baseUrl.replace(/^http/i, "ws");
}

export class RoomClient {
  private readonly WebSocketImpl: WebSocketConstructor;
  private socket: WebSocketLike | null = null;
  private closedByUser = false;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts: number;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly options: RoomClientOptions) {
    this.WebSocketImpl = options.WebSocketImpl ?? WebSocket;
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 5;
  }

  connect(): void {
    if (this.socket) {
      return;
    }

    this.closedByUser = false;
    this.socket = new this.WebSocketImpl(
      toWebSocketUrl(this.options.serverUrl),
    );
    this.socket.addEventListener("open", this.handleOpen);
    this.socket.addEventListener("message", this.handleMessage);
    this.socket.addEventListener("error", this.handleError);
    this.socket.addEventListener("close", this.handleClose);
  }

  private scheduleReconnect(): void {
    if (this.closedByUser) {
      return;
    }
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.options.onError?.(new Error("Room connection lost."));
      return;
    }

    const backoffMs = Math.min(1000 * 2 ** this.reconnectAttempts, 8000);
    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, backoffMs);
  }

  reconnect(): void {
    // Re-sync with the room once the socket is open. If the socket is already
    // gone, the close/error handlers will drive a fresh reconnect.
    this.send({
      type: "reconnect",
      roomId: this.options.roomId,
      playerId: this.options.playerId,
    });
  }

  sendInputFrame(direction: Point, sequence: number): void {
    this.send({
      type: "input-frame",
      roomId: this.options.roomId,
      playerId: this.options.playerId,
      direction,
      sequence,
    });
  }

  sendCaptureProposal(trail: Trail): void {
    this.send({
      type: "capture-proposal",
      roomId: this.options.roomId,
      playerId: this.options.playerId,
      trail,
    });
  }

  close(): void {
    this.closedByUser = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (!this.socket) {
      return;
    }

    this.socket.removeEventListener("open", this.handleOpen);
    this.socket.removeEventListener("message", this.handleMessage);
    this.socket.removeEventListener("error", this.handleError);
    this.socket.removeEventListener("close", this.handleClose);
    this.socket.close();
    this.socket = null;
  }

  private readonly handleOpen = (): void => {
    this.reconnectAttempts = 0;
    this.reconnect();
  };

  private readonly handleMessage = (event?: unknown): void => {
    try {
      const rawPayload = JSON.parse(
        String((event as { data?: unknown } | undefined)?.data),
      );
      if (!isServerMessage(rawPayload)) {
        this.options.onError?.(new Error("Malformed server message."));
        return;
      }

      this.options.onMessage?.(rawPayload);
    } catch {
      this.options.onError?.(new Error("Malformed server message."));
    }
  };

  private readonly handleError = (): void => {
    this.options.onError?.(new Error("Room websocket connection failed."));
  };

  private readonly handleClose = (): void => {
    // Drop the dead socket reference so connect() can open a fresh one.
    this.socket = null;
    this.scheduleReconnect();
  };

  private send(message: ClientMessage): void {
    // Drop frames while the socket is still connecting or already closed.
    // GameScene calls send every frame; throwing here would crash the update loop
    // on every networked game start because the socket is not OPEN between
    // connect() and the async 'open' event. Input frames are resent next tick.
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    this.socket.send(JSON.stringify(message));
  }
}

export function interpolatePoint(from: Point, to: Point, alpha: number): Point {
  return {
    x: from.x + (to.x - from.x) * alpha,
    y: from.y + (to.y - from.y) * alpha,
  };
}

export function shouldPauseRankedScoring(latencyMs: number): boolean {
  return latencyMs > 350;
}
