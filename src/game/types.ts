export type Point = { x: number; y: number };
export type PlayerMode = "safe" | "drawing" | "hit" | "won";
export type EnemyKind = "chaser" | "shooter" | "orbiter" | "disruptor";

export type Trail = {
  playerId: string;
  points: Point[];
  startedAt: number;
};

export type CaptureRegion = {
  id: string;
  polygon: Point[];
  area: number;
};

export type PlayerState = {
  id: string;
  position: Point;
  lastSafePosition: Point;
  mode: PlayerMode;
  health: number;
  score: number;
  activeTrail: Trail | null;
};

export type EnemyState = {
  id: string;
  kind: EnemyKind;
  position: Point;
  velocity: Point;
};

export type ProjectileState = {
  id: string;
  ownerEnemyId: string;
  position: Point;
  velocity: Point;
  radius: number;
};

export type GameState = {
  levelId: string;
  imageSize: { width: number; height: number };
  revealedRatio: number;
  players: PlayerState[];
  captures: CaptureRegion[];
  enemies: EnemyState[];
  projectiles: ProjectileState[];
  won: boolean;
};

export function createInitialGameState(
  levelId: string,
  width: number,
  height: number,
): GameState {
  const start = { x: 0, y: 0 };
  return {
    levelId,
    imageSize: { width, height },
    revealedRatio: 0,
    players: [
      {
        id: "p1",
        position: start,
        lastSafePosition: start,
        mode: "safe",
        health: 3,
        score: 0,
        activeTrail: null,
      },
    ],
    captures: [],
    enemies: [],
    projectiles: [],
    won: false,
  };
}
