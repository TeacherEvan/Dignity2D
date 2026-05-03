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
};

function toWebSocketUrl(baseUrl: string): string {
  return baseUrl.replace(/^http/i, "ws");
}

export class RoomClient {
  private readonly WebSocketImpl: WebSocketConstructor;
  private socket: WebSocketLike | null = null;

  constructor(private readonly options: RoomClientOptions) {
    this.WebSocketImpl = options.WebSocketImpl ?? WebSocket;
  }

  connect(): void {
    if (this.socket) {
      return;
    }

    this.socket = new this.WebSocketImpl(toWebSocketUrl(this.options.serverUrl));
    this.socket.addEventListener("open", this.handleOpen);
    this.socket.addEventListener("message", this.handleMessage);
    this.socket.addEventListener("error", this.handleError);
  }

  reconnect(): void {
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
    if (!this.socket) {
      return;
    }

    this.socket.removeEventListener("open", this.handleOpen);
    this.socket.removeEventListener("message", this.handleMessage);
    this.socket.removeEventListener("error", this.handleError);
    this.socket.close();
    this.socket = null;
  }

  private readonly handleOpen = (): void => {
    this.reconnect();
  };

  private readonly handleMessage = (event?: unknown): void => {
    try {
      const rawPayload = JSON.parse(String((event as { data?: unknown } | undefined)?.data));
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

  private send(message: ClientMessage): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("Room socket is not open.");
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
