import Phaser from "phaser";
import { RoomClient } from "../net/RoomClient";
import { DEFAULT_SERVER_URL } from "../net/serverApi";
import { commitCaptureFromTrail } from "../game/capture/captureArea";
import { movePlayer } from "../game/capture/trailState";
import {
  cancelTrailOnProjectileHit,
  circleHitsPolyline,
} from "../game/collision";
import { createEnemyWave } from "../enemies/EnemySpawner";
import { awardCaptureScore } from "../game/scoring";
import {
  createInitialGameState,
  type EnemyState,
  type GameState,
  type Point,
} from "../game/types";
import { VirtualJoystick } from "../input/VirtualJoystick";
import {
  calculateRevealPercentText,
  makeMaskResolution,
} from "../render/RevealMask";
import { getStandardLayout } from "../display/DeviceLayout";
import { getTerritoryStage } from "../progression/territoryProgression";
import type { GameLaunchData } from "../session";
import { PALETTE } from "../theme/palette";
import { getPendingLaunchData } from "../session";
import { deriveHudFeedback, type HudSnapshot } from "./HudFeedback";

export const BOARD_SIZE = { width: 320, height: 480 } as const;

const PLAYER_ID = "p1";
const PLAYER_SPEED = 160;
const ENEMY_RADIUS = 12;
const HUD_ENTER_DURATION = 260;
const HUD_PULSE_DURATION = 160;
const HUD_FRAME_HEIGHT = 62;
const HUD_FRAME_CUT = 10;

export type GameSceneFrameInput = {
  direction: Point;
  deltaMs: number;
  now: number;
  playerId?: string;
};

export type SceneDiagnosticEvent = {
  name: "capture_committed" | "trail_cancelled" | "enemy_collision";
  payload: Record<string, string | number | boolean>;
};

export type SceneLayoutMetrics = {
  boardSize: { width: number; height: number };
  boardOrigin: Point;
  hudTop: number;
  previewY: number;
};

export type HudDisplayModel = {
  revealText: string;
  scoreText: string;
  statusText: string;
  captureText: string;
  statusColor: string;
};

function makeChamferedRectPoints(
  x: number,
  y: number,
  width: number,
  height: number,
  cut = HUD_FRAME_CUT,
): Phaser.Math.Vector2[] {
  return [
    new Phaser.Math.Vector2(x + cut, y),
    new Phaser.Math.Vector2(x + width, y),
    new Phaser.Math.Vector2(x + width, y + height - cut),
    new Phaser.Math.Vector2(x + width - cut, y + height),
    new Phaser.Math.Vector2(x, y + height),
    new Phaser.Math.Vector2(x, y + cut),
  ];
}

function drawChamferedPanel(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  fillColor: number,
  fillAlpha: number,
  strokeColor: number,
  strokeAlpha: number,
): void {
  const points = makeChamferedRectPoints(x, y, width, height);
  graphics.fillStyle(fillColor, fillAlpha);
  graphics.fillPoints(points, true, true);
  graphics.lineStyle(1.5, strokeColor, strokeAlpha);
  graphics.strokePoints(points, true, true);
}

function resolveLayoutContext(layoutId?: string) {
  switch (layoutId) {
    case "desktop-standard":
      return {
        deviceClass: "desktop" as const,
        orientation: "landscape" as const,
        compactHud: false,
      };
    case "portrait-tablet-standard":
      return {
        deviceClass: "tablet" as const,
        orientation: "portrait" as const,
        compactHud: false,
      };
    case "landscape-tablet-standard":
      return {
        deviceClass: "tablet" as const,
        orientation: "landscape" as const,
        compactHud: false,
      };
    case "landscape-phone-standard":
      return {
        deviceClass: "phone" as const,
        orientation: "landscape" as const,
        compactHud: true,
      };
    default:
      return {
        deviceClass: "phone" as const,
        orientation: "portrait" as const,
        compactHud: true,
      };
  }
}

export function resolveSceneLayoutMetrics(
  layoutId: string | undefined,
  viewportWidth: number,
  viewportHeight: number,
): SceneLayoutMetrics {
  const layout = getStandardLayout(resolveLayoutContext(layoutId));
  const horizontalPadding = 24;
  const bottomPadding = layout.hud.compact ? 120 : 88;
  const boardTop = layout.hud.topOffset + (layout.hud.compact ? 114 : 80);
  const boardWidth = Math.max(
    240,
    Math.min(layout.board.maxWidth, viewportWidth - horizontalPadding * 2),
  );
  const boardHeight = Math.max(
    240,
    Math.min(layout.board.maxHeight, viewportHeight - boardTop - bottomPadding),
  );

  return {
    boardSize: {
      width: Math.round(boardWidth),
      height: Math.round(boardHeight),
    },
    boardOrigin: {
      x: Math.round((viewportWidth - boardWidth) / 2),
      y: boardTop,
    },
    hudTop: layout.hud.topOffset,
    previewY: boardTop - (layout.hud.compact ? 46 : 38),
  };
}

function clampPoint(
  point: Point,
  size: { width: number; height: number },
): Point {
  return {
    x: Math.max(0, Math.min(size.width, point.x)),
    y: Math.max(0, Math.min(size.height, point.y)),
  };
}

function stepEnemies(
  enemies: EnemyState[],
  size: { width: number; height: number },
  deltaMs: number,
): EnemyState[] {
  return enemies.map((enemy) => {
    const nextPosition = {
      x: enemy.position.x + enemy.velocity.x * (deltaMs / 1000),
      y: enemy.position.y + enemy.velocity.y * (deltaMs / 1000),
    };
    let nextVelocity = enemy.velocity;
    if (nextPosition.x <= 12 || nextPosition.x >= size.width - 12) {
      nextVelocity = { ...nextVelocity, x: -nextVelocity.x };
    }
    if (nextPosition.y <= 12 || nextPosition.y >= size.height - 12) {
      nextVelocity = { ...nextVelocity, y: -nextVelocity.y };
    }
    return {
      ...enemy,
      position: clampPoint(nextPosition, size),
      velocity: nextVelocity,
    };
  });
}

export function createSceneGameState(levelId = "solo-default"): GameState {
  return createSceneGameStateForSize(levelId, BOARD_SIZE);
}

export function createSceneGameStateForLaunch(
  launchData: GameLaunchData,
  boardSize: { width: number; height: number },
): GameState {
  const levelId = launchData.levelId ?? "solo-default";
  const baseState = createInitialGameState(
    levelId,
    boardSize.width,
    boardSize.height,
  );

  if (launchData.roomId && launchData.playerId) {
    const roomPlayerIds = launchData.roomPlayerIds ?? [launchData.playerId];
    const orderedPlayerIds = [
      launchData.playerId,
      ...roomPlayerIds.filter((playerId) => playerId !== launchData.playerId),
    ];
    return {
      ...baseState,
      players: orderedPlayerIds.map((playerId, index) => ({
        ...baseState.players[0],
        id: playerId,
        position: {
          x: baseState.players[0].position.x + index * 18,
          y: baseState.players[0].position.y + index * 18,
        },
        lastSafePosition: {
          x: baseState.players[0].lastSafePosition.x + index * 18,
          y: baseState.players[0].lastSafePosition.y + index * 18,
        },
      })),
      enemies: [],
    };
  }

  return {
    ...baseState,
    enemies: createEnemyWave(1, baseState.imageSize),
  };
}

export function createSceneGameStateForSize(
  levelId = "solo-default",
  boardSize: { width: number; height: number },
): GameState {
  const state = createInitialGameState(
    levelId,
    boardSize.width,
    boardSize.height,
  );
  return {
    ...state,
    enemies: createEnemyWave(1, state.imageSize),
  };
}

export function getScenePerformanceFallbackReason(
  prefersReducedMotion: boolean,
): string | null {
  return prefersReducedMotion ? "reduced-motion" : null;
}

export function advanceGameStateWithDiagnostics(
  state: GameState,
  input: GameSceneFrameInput,
): { state: GameState; events: SceneDiagnosticEvent[] } {
  const events: SceneDiagnosticEvent[] = [];
  const playerId = input.playerId ?? PLAYER_ID;
  const currentPlayer = state.players.find((player) => player.id === playerId);
  if (!currentPlayer) {
    return { state, events };
  }

  let nextState: GameState = {
    ...state,
    enemies: stepEnemies(state.enemies, state.imageSize, input.deltaMs),
  };

  const nextPosition = clampPoint(
    {
      x:
        currentPlayer.position.x +
        input.direction.x * PLAYER_SPEED * (input.deltaMs / 1000),
      y:
        currentPlayer.position.y +
        input.direction.y * PLAYER_SPEED * (input.deltaMs / 1000),
    },
    state.imageSize,
  );

  nextState = movePlayer(nextState, playerId, nextPosition, input.now);

  const movedPlayer = nextState.players.find(
    (player) => player.id === playerId,
  );
  if (!movedPlayer) {
    return { state: nextState, events };
  }

  if (
    currentPlayer.mode === "drawing" &&
    movedPlayer.mode === "safe" &&
    movedPlayer.activeTrail
  ) {
    const captureCount = nextState.captures.length;
    nextState = commitCaptureFromTrail(nextState, movedPlayer.activeTrail);
    if (nextState.captures.length > captureCount) {
      const captureArea = nextState.captures.at(-1)?.area ?? 0;
      nextState = awardCaptureScore(nextState, playerId, captureArea);
      events.push({
        name: "capture_committed",
        payload: { revealedRatio: nextState.revealedRatio },
      });
    }
  }

  const activeTrail = nextState.players.find(
    (player) => player.id === playerId,
  )?.activeTrail;
  const hitEnemy =
    activeTrail &&
    nextState.enemies.find((enemy) =>
      circleHitsPolyline(enemy.position, ENEMY_RADIUS, activeTrail.points),
    );
  if (hitEnemy) {
    nextState = cancelTrailOnProjectileHit(nextState, playerId);
    events.push({ name: "trail_cancelled", payload: {} });
    events.push({
      name: "enemy_collision",
      payload: { enemyKind: hitEnemy.kind },
    });
  }

  return { state: nextState, events };
}

export function advanceGameState(
  state: GameState,
  input: GameSceneFrameInput,
): GameState {
  return advanceGameStateWithDiagnostics(state, input).state;
}

export function applyRoomStateSyncSnapshot(
  state: GameState,
  launchData: GameLaunchData,
  snapshot: {
    type: "state-sync";
    roomId: string;
    stateVersion: number;
    imageId: string;
    playerIds: string[];
  },
): { state: GameState; launchData: GameLaunchData } {
  const activePlayerId = launchData.playerId ?? PLAYER_ID;
  const orderedPlayerIds = [
    activePlayerId,
    ...snapshot.playerIds.filter((playerId) => playerId !== activePlayerId),
  ];

  return {
    state: {
      ...state,
      players: orderedPlayerIds.map((playerId, index) => {
        const existingPlayer = state.players.find(
          (player) => player.id === playerId,
        );
        if (existingPlayer) {
          return existingPlayer;
        }

        return {
          ...state.players[0],
          id: playerId,
          position: {
            x: state.players[0].position.x + index * 18,
            y: state.players[0].position.y + index * 18,
          },
          lastSafePosition: {
            x: state.players[0].lastSafePosition.x + index * 18,
            y: state.players[0].lastSafePosition.y + index * 18,
          },
          activeTrail: null,
          score: 0,
          mode: "safe",
        };
      }),
    },
    launchData: {
      ...launchData,
      imageId: snapshot.imageId,
      roomPlayerIds: orderedPlayerIds,
      stateVersion: snapshot.stateVersion,
    },
  };
}

export function makeSceneLaunchData(data: GameLaunchData): GameLaunchData {
  return { ...data };
}

export function makeHudSnapshot(
  state: GameState,
  launchData: GameLaunchData,
): HudSnapshot {
  const player = state.players[0];
  const territoryStage = getTerritoryStage(state.revealedRatio);
  const statusText =
    player?.mode === "drawing" && player.activeTrail
      ? "Trail exposed"
      : makeGameStatusText(
          launchData,
          state.won,
          state.enemies.length,
          territoryStage.label,
        );

  return {
    score: player?.score ?? 0,
    revealedRatio: state.revealedRatio,
    statusText,
    captureCount: state.captures.length,
    won: state.won,
  };
}

export function makeHudDisplayModel(snapshot: HudSnapshot): HudDisplayModel {
  let statusColor = PALETTE.css.SAND;

  if (snapshot.won) {
    statusColor = PALETTE.css.GOLD;
  } else if (snapshot.statusText === "Signal concealed") {
    statusColor = PALETTE.css.CYAN;
  } else if (snapshot.statusText === "Trail exposed") {
    statusColor = PALETTE.css.MAGENTA;
  } else if (snapshot.captureCount > 0 || snapshot.revealedRatio > 0) {
    statusColor = PALETTE.css.AMBER;
  }

  return {
    revealText: calculateRevealPercentText(snapshot.revealedRatio),
    scoreText: `Score ${snapshot.score}`,
    statusText: snapshot.statusText,
    captureText: String(snapshot.captureCount).padStart(2, "0"),
    statusColor,
  };
}

export function makePreviewLabel(imageUrl?: string): string {
  return imageUrl ? "Chosen image" : "Concealed image";
}

export function makeGameStatusText(
  launchData: GameLaunchData,
  won: boolean,
  enemyCount: number,
  territoryLabel?: string,
): string {
  if (won) {
    return "Image secured";
  }
  if (launchData.roomId) {
    const playerCount = launchData.roomPlayerIds?.length;
    if (playerCount && playerCount > 1) {
      return `Room ${launchData.roomId} · ${playerCount} players linked`;
    }

    return `Room ${launchData.roomId} · Awaiting second player`;
  }
  if (launchData.imageId && territoryLabel === "Border Camp") {
    return "Signal concealed";
  }
  if (territoryLabel) {
    return territoryLabel;
  }

  if (launchData.imageId) {
    return "Signal concealed";
  }

  return `Enemies ${enemyCount}`;
}

export class GameScene extends Phaser.Scene {
  private state!: GameState;
  private readonly joystick = new VirtualJoystick();
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private roomClient: RoomClient | null = null;
  private inputSequence = 0;
  private activePlayerId = PLAYER_ID;
  private boardOrigin = { x: 0, y: 0 };
  private hudChrome?: Phaser.GameObjects.Graphics;
  private hudSignal?: Phaser.GameObjects.Graphics;
  private revealText?: Phaser.GameObjects.Text;
  private scoreText?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;
  private captureCountText?: Phaser.GameObjects.Text;
  private captureLabelText?: Phaser.GameObjects.Text;
  private captureGraphics?: Phaser.GameObjects.Graphics;
  private trailGraphics?: Phaser.GameObjects.Graphics;
  private playerMarker?: Phaser.GameObjects.Arc;
  private teammateMarkers: Phaser.GameObjects.Arc[] = [];
  private enemyMarkers: Phaser.GameObjects.Arc[] = [];
  private launchData: GameLaunchData = {};
  private previewFrame?: Phaser.GameObjects.Rectangle;
  private previewImage?: Phaser.GameObjects.Image;
  private previewLabel?: Phaser.GameObjects.Text;
  private hudSnapshot: HudSnapshot | null = null;
  private prefersReducedMotion = false;
  private performanceFallbackLogged = false;

  constructor() {
    super("GameScene");
  }

  init(data: GameLaunchData): void {
    this.launchData = makeSceneLaunchData({
      ...getPendingLaunchData(),
      ...data,
    });
    this.activePlayerId = this.launchData.playerId ?? PLAYER_ID;
  }

  preload(): void {
    if (this.launchData.imageUrl) {
      this.load.image("selected-preview", this.launchData.imageUrl);
    }
  }

  create(): void {
    const layoutMetrics = resolveSceneLayoutMetrics(
      this.launchData.layoutId,
      this.scale.width,
      this.scale.height,
    );
    this.state = createSceneGameStateForLaunch(
      this.launchData,
      layoutMetrics.boardSize,
    );
    this.prefersReducedMotion = this.launchData.motionMode === "reduced";
    this.cursors = this.input.keyboard?.createCursorKeys();

    const maskSize = makeMaskResolution(
      this.state.imageSize.width,
      this.state.imageSize.height,
      640,
    );
    this.boardOrigin = layoutMetrics.boardOrigin;
    const boardSize = this.state.imageSize;

    this.add
      .rectangle(
        this.boardOrigin.x + boardSize.width / 2,
        this.boardOrigin.y + boardSize.height / 2,
        boardSize.width,
        boardSize.height,
        PALETTE.VOID,
      )
      .setStrokeStyle(3, PALETTE.GOLD);

    this.previewFrame = this.add
      .rectangle(
        this.boardOrigin.x + boardSize.width / 2,
        layoutMetrics.previewY,
        150,
        84,
        PALETTE.BORDER,
      )
      .setStrokeStyle(2, PALETTE.SAND);
    if (this.launchData.imageUrl && this.textures.exists("selected-preview")) {
      this.previewImage = this.add.image(
        this.boardOrigin.x + boardSize.width / 2,
        layoutMetrics.previewY,
        "selected-preview",
      );
      this.previewImage.setDisplaySize(142, 76);
    }
    this.previewLabel = this.add
      .text(
        this.boardOrigin.x + boardSize.width / 2,
        Math.max(24, layoutMetrics.previewY - 44),
        makePreviewLabel(this.launchData.imageUrl),
        {
          color: PALETTE.css.SAND,
          fontSize: "14px",
        },
      )
      .setOrigin(0.5);

    this.captureGraphics = this.add.graphics();
    this.trailGraphics = this.add.graphics();
    this.playerMarker = this.add.circle(0, 0, 8, PALETTE.CYAN);
    this.teammateMarkers = this.state.players
      .slice(1)
      .map(() => this.add.circle(0, 0, 6, PALETTE.SAND));
    this.enemyMarkers = this.state.enemies.map(() =>
      this.add.circle(0, 0, 10, PALETTE.AMBER),
    );

    this.hudChrome = this.add.graphics();
    this.hudSignal = this.add.graphics();
    this.drawHudChrome(layoutMetrics);

    this.revealText = this.add.text(
      34,
      layoutMetrics.hudTop + 14,
      "00% Revealed",
      {
        color: PALETTE.css.CYAN,
        fontFamily: '"Palatino Linotype", Georgia, serif',
        fontSize: "20px",
      },
    );
    this.scoreText = this.add
      .text(214, layoutMetrics.hudTop + 16, "Score 0", {
        color: PALETTE.css.GOLD,
        fontFamily: '"Trebuchet MS", sans-serif',
        fontSize: "16px",
      })
      .setOrigin(1, 0);
    this.statusText = this.add.text(
      34,
      layoutMetrics.hudTop + 40,
      `Mask ${maskSize.width}x${maskSize.height}`,
      {
        color: PALETTE.css.SAND,
        fontFamily: '"Trebuchet MS", sans-serif',
        fontSize: "14px",
      },
    );
    this.captureCountText = this.add
      .text(this.scale.width - 48, layoutMetrics.hudTop + 12, "00", {
        color: PALETTE.css.GOLD,
        fontFamily: '"Palatino Linotype", Georgia, serif',
        fontSize: "22px",
      })
      .setOrigin(0.5, 0);
    this.captureLabelText = this.add
      .text(this.scale.width - 48, layoutMetrics.hudTop + 36, "Captures", {
        color: PALETTE.css.SAND,
        fontFamily: '"Trebuchet MS", sans-serif',
        fontSize: "11px",
      })
      .setOrigin(0.5, 0);

    if (!this.prefersReducedMotion) {
      this.playHudEntrance();
    }

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown) return;
      this.joystick.setDirection({
        x: pointer.x - (this.boardOrigin.x + boardSize.width / 2),
        y: pointer.y - (this.boardOrigin.y + boardSize.height / 2),
      });
    });
    this.input.on("pointerup", () => {
      this.joystick.setDirection({ x: 0, y: 0 });
    });

    if (
      this.launchData.roomId &&
      this.launchData.playerId &&
      DEFAULT_SERVER_URL
    ) {
      this.roomClient = new RoomClient({
        roomId: this.launchData.roomId,
        playerId: this.launchData.playerId,
        serverUrl: DEFAULT_SERVER_URL,
        onMessage: (message) => {
          if (message.type === "state-sync") {
            const synced = applyRoomStateSyncSnapshot(
              this.state,
              this.launchData,
              message,
            );
            this.state = synced.state;
            this.launchData = synced.launchData;
            this.renderState();
          }
        },
      });
      this.roomClient.connect();
      this.events.once("shutdown", () => {
        this.roomClient?.close();
        this.roomClient = null;
      });
    }

    const fallbackReason = getScenePerformanceFallbackReason(
      this.prefersReducedMotion,
    );
    if (fallbackReason && !this.performanceFallbackLogged) {
      this.launchData.diagnostics?.track("performance_fallback", {
        reason: fallbackReason,
      });
      this.launchData.diagnostics?.flush();
      this.performanceFallbackLogged = true;
    }

    this.renderState();
  }

  update(time: number, delta: number): void {
    const keyboardDirection = this.getKeyboardDirection();
    const direction =
      keyboardDirection.x !== 0 || keyboardDirection.y !== 0
        ? keyboardDirection
        : this.joystick.getDirection();

    const frameResult = advanceGameStateWithDiagnostics(this.state, {
      direction,
      deltaMs: delta,
      now: time,
      playerId: this.activePlayerId,
    });
    this.state = frameResult.state;
    frameResult.events.forEach((event) => {
      this.launchData.diagnostics?.track(event.name, event.payload);
    });
    if (frameResult.events.length > 0) {
      this.launchData.diagnostics?.flush();
    }
    if (this.roomClient) {
      this.inputSequence += 1;
      this.roomClient.sendInputFrame(direction, this.inputSequence);
    }
    this.renderState();
  }

  private getKeyboardDirection(): Point {
    if (!this.cursors) return { x: 0, y: 0 };

    return {
      x:
        (this.cursors.right?.isDown ? 1 : 0) -
        (this.cursors.left?.isDown ? 1 : 0),
      y:
        (this.cursors.down?.isDown ? 1 : 0) - (this.cursors.up?.isDown ? 1 : 0),
    };
  }

  private toScreen(point: Point): Point {
    return {
      x: this.boardOrigin.x + point.x,
      y: this.boardOrigin.y + point.y,
    };
  }

  private renderState(): void {
    const player = this.state.players[0];
    if (
      !player ||
      !this.captureGraphics ||
      !this.trailGraphics ||
      !this.playerMarker
    ) {
      return;
    }

    this.captureGraphics.clear();
    this.captureGraphics.fillStyle(PALETTE.CYAN, 0.18);
    this.captureGraphics.lineStyle(2, PALETTE.CYAN, 0.7);
    for (const capture of this.state.captures) {
      const points = capture.polygon.map((point) => this.toScreen(point));
      this.captureGraphics.beginPath();
      this.captureGraphics.moveTo(points[0]?.x ?? 0, points[0]?.y ?? 0);
      for (let index = 1; index < points.length; index += 1) {
        this.captureGraphics.lineTo(points[index]!.x, points[index]!.y);
      }
      this.captureGraphics.closePath();
      this.captureGraphics.fillPath();
      this.captureGraphics.strokePath();
    }

    this.trailGraphics.clear();
    this.trailGraphics.lineStyle(4, PALETTE.GOLD, 0.9);
    const trail = player.activeTrail?.points ?? [];
    if (trail.length > 1) {
      this.trailGraphics.beginPath();
      const first = this.toScreen(trail[0]!);
      this.trailGraphics.moveTo(first.x, first.y);
      for (let index = 1; index < trail.length; index += 1) {
        const point = this.toScreen(trail[index]!);
        this.trailGraphics.lineTo(point.x, point.y);
      }
      this.trailGraphics.strokePath();
    }

    const playerPosition = this.toScreen(player.position);
    this.playerMarker.setPosition(playerPosition.x, playerPosition.y);

    while (this.teammateMarkers.length < this.state.players.length - 1) {
      this.teammateMarkers.push(this.add.circle(0, 0, 6, PALETTE.SAND));
    }

    this.state.players.slice(1).forEach((teammate, index) => {
      const marker = this.teammateMarkers[index];
      if (!marker) {
        return;
      }

      const position = this.toScreen(teammate.position);
      marker.setPosition(position.x, position.y);
    });
    this.teammateMarkers
      .slice(this.state.players.length - 1)
      .forEach((marker) => {
        marker.setPosition(-9999, -9999);
      });

    this.state.enemies.forEach((enemy, index) => {
      const marker = this.enemyMarkers[index];
      if (!marker) return;
      const position = this.toScreen(enemy.position);
      marker.setPosition(position.x, position.y);
    });

    const nextHudSnapshot = makeHudSnapshot(this.state, this.launchData);
    const hudDisplay = makeHudDisplayModel(nextHudSnapshot);

    this.revealText?.setText(hudDisplay.revealText);
    this.scoreText?.setText(hudDisplay.scoreText);
    this.statusText
      ?.setText(hudDisplay.statusText)
      .setColor(hudDisplay.statusColor);
    this.captureCountText?.setText(hudDisplay.captureText);

    if (!this.prefersReducedMotion) {
      this.playHudFeedback(
        deriveHudFeedback(this.hudSnapshot, nextHudSnapshot),
      );
    }

    this.hudSnapshot = nextHudSnapshot;
  }

  private playHudEntrance(): void {
    const hudTexts = [
      this.revealText,
      this.scoreText,
      this.statusText,
      this.captureCountText,
      this.captureLabelText,
    ].filter((text): text is Phaser.GameObjects.Text => Boolean(text));

    hudTexts.forEach((text, index) => {
      const baseY = text.y;
      text.setAlpha(0);
      text.setY(baseY + 6);
      this.tweens.add({
        targets: text,
        alpha: 1,
        y: baseY,
        delay: index * 80,
        duration: HUD_ENTER_DURATION,
        ease: "Cubic.Out",
      });
    });
  }

  private playHudFeedback(
    feedback: ReturnType<typeof deriveHudFeedback>,
  ): void {
    if (feedback.pulseReveal || feedback.captureCue) {
      this.pulseHudText(this.revealText, 1.08);
    }
    if (feedback.pulseScore) {
      this.pulseHudText(this.scoreText, 1.05);
    }
    if (feedback.pulseStatus || feedback.captureCue) {
      this.pulseHudText(this.statusText, 1.04, true);
    }
    if (feedback.captureCue) {
      this.pulseHudText(this.captureCountText, 1.08);
    }
  }

  private drawHudChrome(layoutMetrics: SceneLayoutMetrics): void {
    const frameLeft = 20;
    const frameTop = layoutMetrics.hudTop + 6;
    const frameWidth = Math.min(210, this.scale.width - 116);
    const sealSize = 64;
    const sealLeft = this.scale.width - sealSize - 18;

    this.hudChrome?.clear();
    this.hudSignal?.clear();

    if (!this.hudChrome || !this.hudSignal) {
      return;
    }

    drawChamferedPanel(
      this.hudChrome,
      frameLeft,
      frameTop,
      frameWidth,
      HUD_FRAME_HEIGHT,
      PALETTE.BORDER,
      0.9,
      PALETTE.SAND,
      0.65,
    );
    drawChamferedPanel(
      this.hudChrome,
      sealLeft,
      frameTop,
      sealSize,
      HUD_FRAME_HEIGHT,
      PALETTE.BORDER,
      0.92,
      PALETTE.GOLD,
      0.7,
    );

    this.hudSignal.lineStyle(1, PALETTE.CYAN, 0.45);
    this.hudSignal.lineBetween(
      frameLeft + 14,
      frameTop + 26,
      frameLeft + frameWidth - 18,
      frameTop + 26,
    );
    this.hudSignal.lineStyle(1, PALETTE.AMBER, 0.32);
    this.hudSignal.lineBetween(
      sealLeft + sealSize / 2,
      frameTop + 10,
      sealLeft + sealSize / 2,
      frameTop + HUD_FRAME_HEIGHT - 10,
    );
  }

  private pulseHudText(
    text: Phaser.GameObjects.Text | undefined,
    scale: number,
    nudgeUp = false,
  ): void {
    if (!text) {
      return;
    }

    const baseY = text.y;
    this.tweens.killTweensOf(text);
    text.setScale(1);
    text.setAlpha(1);
    text.setY(baseY);
    this.tweens.add({
      targets: text,
      scaleX: scale,
      scaleY: scale,
      alpha: 0.82,
      y: nudgeUp ? baseY - 3 : baseY,
      duration: HUD_PULSE_DURATION,
      yoyo: true,
      ease: "Cubic.Out",
    });
  }
}
