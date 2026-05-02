export type GameLaunchData = {
  levelId?: string;
  roomId?: string;
  playerId?: string;
  imageId?: string;
  imageUrl?: string;
  stateVersion?: number;
  layoutId?: string;
  motionMode?: "full" | "reduced";
};

let pendingLaunchData: GameLaunchData = {};

export function setPendingLaunchData(data: GameLaunchData): void {
  pendingLaunchData = data;
}

export function getPendingLaunchData(): GameLaunchData {
  return pendingLaunchData;
}

export type GameSessionMode = "solo" | "multiplayer";

export function resolveSessionMode(data: GameLaunchData): GameSessionMode {
  return data.roomId && data.playerId ? "multiplayer" : "solo";
}
