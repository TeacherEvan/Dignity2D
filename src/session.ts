export type GameLaunchData = {
  levelId?: string;
  roomId?: string;
  playerId?: string;
  imageId?: string;
  imageUrl?: string;
  stateVersion?: number;
};

let pendingLaunchData: GameLaunchData = {};

export function setPendingLaunchData(data: GameLaunchData): void {
  pendingLaunchData = data;
}

export function getPendingLaunchData(): GameLaunchData {
  return pendingLaunchData;
}
