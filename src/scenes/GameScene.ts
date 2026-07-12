import Phaser from "phaser";
import { RoomClient } from "../net/RoomClient";
import { DEFAULT_SERVER_URL } from "../net/serverApi";
import { commitCaptureFromTrail } from "../game/capture/captureArea";
import { movePlayer } from "../game/capture/trailState";
import {
  cancelTrailOnProjectileHit,
  circleHitsPolyline,
  projectileHitsPoint,
} from "../game/collision";
import { createEnemyWave } from "../enemies/EnemySpawner";
import { stepEnemies } from "../enemies/enemyStep";
import {
  awardCaptureScore,
  comboMultiplier,
  registerComboForPlayer,
  resetComboForPlayer,
} from "../game/scoring";
import { damagePlayer } from "../game/player";
import { spawnProjectile, stepProjectiles } from "../game/projectile";
import {
  createInitialGameState,
  type EnemyState,
  type GameState,
  type Point,
  type ProjectileState,
} from "../game/types";
import { VirtualJoystick } from "../input/VirtualJoystick";
import {
  calculateRevealPercentText,
  makeMaskResolution,
} from "../render/RevealMask";
import { getStandardLayout } from "../display/DeviceLayout";
import { getTerritoryStage } from "../progression/territoryProgression";
import { enemyColor, enemyGlyph } from "../theme/visuals";
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
  name:
    | "capture_committed"
    | "trail_cancelled"
    | "enemy_collision"
    | "game_over";
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
  if (state.gameOver) {
    return { state, events };
  }

  const activeTrailPoints = currentPlayer.activeTrail?.points ?? [];
  const stepResult = stepEnemies(state.enemies, {
    deltaMs: input.deltaMs,
    now: input.now,
    bounds: state.imageSize,
    activeTrailPoints,
    playerPositions: state.players.map((player) => player.position),
    bothPlayersDrawing: state.players.every(
      (player) => player.mode === "drawing",
    ),
  });

  let nextState: GameState = {
    ...state,
    enemies: stepResult.enemies,
  };

  if (stepResult.newProjectiles.length > 0) {
    const spawned = stepResult.newProjectiles.reduce<ProjectileState[]>(
      (projectiles, shot) =>
        spawnProjectile(projectiles, {
          id: `proj-${input.now}-${shot.ownerEnemyId}-${projectiles.length}`,
          ownerEnemyId: shot.ownerEnemyId,
          position: shot.position,
          velocity: shot.velocity,
          radius: 5,
        }),
      nextState.projectiles,
    );
    nextState = { ...nextState, projectiles: spawned };
  }

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
      nextState = awardCaptureScore(
        nextState,
        playerId,
        captureArea,
        movedPlayer.combo,
      );
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
    nextState = resetComboForPlayer(nextState, playerId);
    events.push({ name: "trail_cancelled", payload: {} });
    events.push({
      name: "enemy_collision",
      payload: { enemyKind: hitEnemy.kind },
    });
  }

  const steppedProjectiles = stepProjectiles(
    nextState.projectiles,
    input.deltaMs,
    input.now,
    state.imageSize,
  );
  const struck = steppedProjectiles.find((projectile) =>
    projectileHitsPoint(projectile, movedPlayer.position, 8),
  );
  if (struck) {
    const damaged = damagePlayer(nextState, playerId, input.now);
    nextState = damaged.state;
    if (damaged.lostLife) {
      events.push({
        name: "enemy_collision",
        payload: { enemyKind: struck.ownerEnemyId, lifeLost: true },
      });
      if (damaged.gameOver) {
        events.push({ name: "game_over", payload: {} });
      }
    }
  } else {
    nextState = { ...nextState, projectiles: steppedProjectiles };
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

  private background?: Phaser.GameObjects.Graphics;
  private bgGlow?: Phaser.GameObjects.Graphics;
  private bgGrid?: Phaser.GameObjects.Graphics;
  private bgScan?: Phaser.GameObjects.Graphics;
  private bgVignette?: Phaser.GameObjects.Graphics;
  private sweep?: Phaser.GameObjects.Graphics;
  private captureGlow?: Phaser.GameObjects.Graphics;
  private trailGlow?: Phaser.GameObjects.Graphics;
  private playerPulse?: Phaser.GameObjects.Arc;
  private enemyPulseMarkers: Phaser.GameObjects.Arc[] = [];
  private enemyGlowMarkers: Phaser.GameObjects.Arc[] = [];
  private enemyGlyphTexts: Phaser.GameObjects.Text[] = [];
  private projectileMarkers: Phaser.GameObjects.Arc[] = [];
  private projectileGlowMarkers: Phaser.GameObjects.Arc[] = [];
  private playerGlow?: Phaser.GameObjects.Arc;
  private livesText?: Phaser.GameObjects.Text;
  private comboText?: Phaser.GameObjects.Text;
  private enemyTagTexts: Phaser.GameObjects.Text[] = [];
  private overlayPanel?: Phaser.GameObjects.Rectangle;
  private overlayText?: Phaser.GameObjects.Text;
  private overlayShown: "" | "win" | "lose" = "";

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

    this.drawBackground(layoutMetrics, boardSize);

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
    this.trailGlow = this.add.graphics().setDepth(-1);
    this.captureGlow = this.add.graphics().setDepth(0);
    this.playerGlow = this.add.circle(0, 0, 18, PALETTE.CYAN, 0.18);
    this.playerPulse = this.add.circle(0, 0, 14, PALETTE.CYAN, 0).setStrokeStyle(2, PALETTE.CYAN, 0.5);
    this.playerMarker = this.add.circle(0, 0, 8, PALETTE.CYAN);
    this.playerMarker.setStrokeStyle(2, PALETTE.WHITE, 0.9);
    this.teammateMarkers = this.state.players
      .slice(1)
      .map(() => this.add.circle(0, 0, 6, PALETTE.SAND));
    this.enemyMarkers = this.state.enemies.map(() =>
      this.add.circle(0, 0, 11, PALETTE.AMBER),
    );
    this.enemyGlowMarkers = this.state.enemies.map(() =>
      this.add.circle(0, 0, 22, PALETTE.AMBER, 0.16),
    );
    this.enemyPulseMarkers = this.state.enemies.map(() =>
      this.add.circle(0, 0, 16, PALETTE.AMBER, 0).setStrokeStyle(2, PALETTE.AMBER, 0.4),
    );
    this.enemyGlyphTexts = this.state.enemies.map(() =>
      this.add
        .text(0, 0, "", {
          color: PALETTE.css.WHITE,
          fontFamily: '"Trebuchet MS", sans-serif',
          fontSize: "14px",
        })
        .setOrigin(0.5),
    );
    this.projectileGlowMarkers = this.state.projectiles.map(() =>
      this.add.circle(0, 0, 10, PALETTE.MAGENTA, 0.18),
    );
    this.projectileMarkers = this.state.projectiles.map(() =>
      this.add.circle(0, 0, 4, PALETTE.MAGENTA),
    );

    this.livesText = this.add
      .text(34, layoutMetrics.hudTop + 62, "", {
        color: PALETTE.css.GOLD,
        fontFamily: '"Trebuchet MS", sans-serif',
        fontSize: "15px",
      })
      .setOrigin(0, 0.5);
    this.comboText = this.add
      .text(this.scale.width - 48, layoutMetrics.hudTop + 58, "", {
        color: PALETTE.css.MAGENTA,
        fontFamily: '"Trebuchet MS", sans-serif',
        fontSize: "13px",
      })
      .setOrigin(0.5, 0.5);

    this.overlayPanel = this.add
      .rectangle(
        this.boardOrigin.x + boardSize.width / 2,
        this.boardOrigin.y + boardSize.height / 2,
        boardSize.width,
        boardSize.height,
        PALETTE.VOID,
        0.72,
      )
      .setVisible(false);
    this.overlayText = this.add
      .text(
        this.boardOrigin.x + boardSize.width / 2,
        this.boardOrigin.y + boardSize.height / 2,
        "",
        {
          color: PALETTE.css.GOLD,
          fontFamily: '"Palatino Linotype", Georgia, serif',
          fontSize: "26px",
          align: "center",
        },
      )
      .setOrigin(0.5)
      .setVisible(false);

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
      .text(238, layoutMetrics.hudTop + 16, "Score 0", {
        color: PALETTE.css.GOLD,
        fontFamily: '"Trebuchet MS", sans-serif',
        fontSize: "16px",
      })
      .setOrigin(0, 0);
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
        onError: (error) => {
          this.launchData.diagnostics?.track("room_connection_error", {
            message: error.message,
          });
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
    this.animateBackground(delta);
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
    this.captureGlow?.clear();
    const shimmer = this.prefersReducedMotion
      ? 0.7
      : 0.5 + 0.25 * Math.sin(this.time.now / 280);
    this.captureGraphics.fillStyle(PALETTE.CYAN, 0.16);
    this.captureGraphics.lineStyle(2, PALETTE.CYAN, shimmer);
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

      // Animated neon border drawn on a separate additive-feel layer.
      const pulse = this.prefersReducedMotion
        ? 0.6
        : 0.55 + 0.35 * Math.sin(this.time.now / 360);
      this.captureGlow?.lineStyle(3, PALETTE.CYAN, pulse);
      this.captureGlow?.strokePoints(points, true, true);
      this.captureGlow?.fillStyle(PALETTE.CYAN, 0.06);
      this.captureGlow?.fillPoints(points, true, true);
    }

    this.trailGraphics.clear();
    this.trailGlow?.clear();
    if (!this.prefersReducedMotion) {
      this.trailGraphics.lineStyle(9, PALETTE.GOLD, 0.18);
      const glowTrail = player.activeTrail?.points ?? [];
      if (glowTrail.length > 1) {
        this.trailGraphics.beginPath();
        const gFirst = this.toScreen(glowTrail[0]!);
        this.trailGraphics.moveTo(gFirst.x, gFirst.y);
        for (let index = 1; index < glowTrail.length; index += 1) {
          const point = this.toScreen(glowTrail[index]!);
          this.trailGraphics.lineTo(point.x, point.y);
        }
        this.trailGraphics.strokePath();
      }
    }
    this.trailGraphics.lineStyle(3, PALETTE.GOLD, 0.95);
    const trail = player.activeTrail?.points ?? [];
    if (trail.length > 1) {
      // Neon outer glow under the crisp line.
      this.trailGlow?.lineStyle(7, PALETTE.GOLD, 0.3);
      this.trailGlow?.beginPath();
      const g0 = this.toScreen(trail[0]!);
      this.trailGlow?.moveTo(g0.x, g0.y);
      for (let index = 1; index < trail.length; index += 1) {
        const point = this.toScreen(trail[index]!);
        this.trailGlow?.lineTo(point.x, point.y);
      }
      this.trailGlow?.strokePath();

      this.trailGraphics.beginPath();
      const first = this.toScreen(trail[0]!);
      this.trailGraphics.moveTo(first.x, first.y);
      for (let index = 1; index < trail.length; index += 1) {
        const point = this.toScreen(trail[index]!);
        this.trailGraphics.lineTo(point.x, point.y);
      }
      this.trailGraphics.strokePath();
      const tip = this.toScreen(trail[trail.length - 1]!);
      this.trailGraphics.fillStyle(PALETTE.WHITE, 0.9);
      this.trailGraphics.fillCircle(tip.x, tip.y, 4);
      // Pulsing ring at the active tip so the close-point is obvious.
      if (!this.prefersReducedMotion) {
        const ring = 5 + 2 * (0.5 + 0.5 * Math.sin(this.time.now / 160));
        this.trailGlow?.lineStyle(2, PALETTE.WHITE, 0.6);
        this.trailGlow?.strokeCircle(tip.x, tip.y, ring);
      }
    }

    const playerPosition = this.toScreen(player.position);
    this.playerMarker.setPosition(playerPosition.x, playerPosition.y);
    this.playerGlow?.setPosition(playerPosition.x, playerPosition.y);
    const invuln = this.time.now < player.invulnUntil;
    this.playerMarker.setAlpha(invuln && !this.prefersReducedMotion ? 0.45 : 1);
    this.playerPulse?.setPosition(playerPosition.x, playerPosition.y);
    if (this.playerPulse && !this.prefersReducedMotion) {
      const p = 0.5 + 0.5 * Math.sin(this.time.now / 240);
      const radius = 14 + 4 * p;
      this.playerPulse.setScale(radius / 14).setStrokeStyle(2, PALETTE.CYAN, 0.25 + 0.4 * p);
    }

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

    while (this.enemyMarkers.length < this.state.enemies.length) {
      this.enemyMarkers.push(this.add.circle(0, 0, 11, PALETTE.AMBER));
      this.enemyGlowMarkers.push(
        this.add.circle(0, 0, 22, PALETTE.AMBER, 0.16),
      );
      this.enemyPulseMarkers.push(
        this.add.circle(0, 0, 16, PALETTE.AMBER, 0).setStrokeStyle(2, PALETTE.AMBER, 0.4),
      );
      this.enemyGlyphTexts.push(
        this.add
          .text(0, 0, "", {
            color: PALETTE.css.WHITE,
            fontFamily: '"Trebuchet MS", sans-serif',
            fontSize: "14px",
          })
          .setOrigin(0.5),
      );
    }
    this.state.enemies.forEach((enemy, index) => {
      const marker = this.enemyMarkers[index];
      const glow = this.enemyGlowMarkers[index];
      const pulse = this.enemyPulseMarkers[index];
      const glyph = this.enemyGlyphTexts[index];
      if (!marker) return;
      const position = this.toScreen(enemy.position);
      const color = enemyColor(enemy.kind);
      marker.setPosition(position.x, position.y).setFillStyle(color, 1);
      glow?.setPosition(position.x, position.y).setFillStyle(color, 0.16);
      if (pulse && !this.prefersReducedMotion) {
        const p = 0.5 + 0.5 * Math.sin(this.time.now / 300 + index * 1.3);
        pulse.setPosition(position.x, position.y).setStrokeStyle(2, color, 0.2 + 0.45 * p);
        pulse.setScale((16 + 4 * p) / 16);
      }
      glyph
        ?.setPosition(position.x, position.y)
        .setText(enemyGlyph(enemy.kind))
        .setColor(PALETTE.css.WHITE);
    });

    while (this.projectileMarkers.length < this.state.projectiles.length) {
      this.projectileGlowMarkers.push(
        this.add.circle(0, 0, 10, PALETTE.MAGENTA, 0.18),
      );
      this.projectileMarkers.push(this.add.circle(0, 0, 4, PALETTE.MAGENTA));
    }
    this.state.projectiles.forEach((projectile, index) => {
      const marker = this.projectileMarkers[index];
      const glow = this.projectileGlowMarkers[index];
      if (!marker) return;
      const position = this.toScreen(projectile.position);
      marker.setPosition(position.x, position.y);
      glow?.setPosition(position.x, position.y);
    });
    this.projectileMarkers
      .slice(this.state.projectiles.length)
      .forEach((marker) => marker.setPosition(-9999, -9999));
    this.projectileGlowMarkers
      .slice(this.state.projectiles.length)
      .forEach((marker) => marker.setPosition(-9999, -9999));

    const nextHudSnapshot = makeHudSnapshot(this.state, this.launchData);
    const hudDisplay = makeHudDisplayModel(nextHudSnapshot);

    this.revealText?.setText(hudDisplay.revealText);
    this.scoreText?.setText(hudDisplay.scoreText);
    this.statusText
      ?.setText(hudDisplay.statusText)
      .setColor(hudDisplay.statusColor);
    this.captureCountText?.setText(hudDisplay.captureText);

    const lives = player.lives;
    this.livesText?.setText("◆".repeat(Math.max(0, lives)) || "—");
    const combo = player.combo;
    this.comboText?.setText(combo > 1 ? `x${combo} COMBO` : "");

    this.renderOverlay();

    if (!this.prefersReducedMotion) {
      this.playHudFeedback(
        deriveHudFeedback(this.hudSnapshot, nextHudSnapshot),
      );
    }

    this.hudSnapshot = nextHudSnapshot;
  }

  private drawBackground(
    _layoutMetrics: SceneLayoutMetrics,
    boardSize: { width: number; height: number },
  ): void {
    const origin = this.boardOrigin;
    const ox = origin.x;
    const oy = origin.y;

    // Live layered atmosphere (Graphics objects, behind gameplay at depth -5..-3).
    // Live objects composite reliably under WebGL readback, unlike baked RT frames.

    // Base wash: vertical gradient from a desaturated gold tint down to the void.
    const base = this.add.graphics().setPosition(ox, oy).setDepth(-5);
    const bands = 28;
    const top = Phaser.Display.Color.IntegerToColor(0x1d1226);
    const bottom = Phaser.Display.Color.IntegerToColor(PALETTE.VOID);
    for (let i = 0; i < bands; i++) {
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(top, bottom, bands - 1, i);
      base.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
      base.fillRect(0, (boardSize.height * i) / bands, boardSize.width, boardSize.height / bands + 1);
    }

    // Soft radial core glow near the upper-center for depth.
    const glow = this.add.graphics().setPosition(ox, oy).setDepth(-4).setBlendMode(Phaser.BlendModes.ADD);
    const cx = boardSize.width / 2;
    const cy = boardSize.height * 0.38;
    const maxR = Math.max(boardSize.width, boardSize.height) * 0.8;
    const glowSteps = 24;
    for (let i = glowSteps; i >= 1; i--) {
      const r = (maxR * i) / glowSteps;
      const a = 0.07 * (1 - i / glowSteps);
      glow.fillStyle(PALETTE.GOLD, a);
      glow.fillCircle(cx, cy, r);
    }

    // Faint dot grid for spatial reference.
    const dots = this.add.graphics().setPosition(ox, oy).setDepth(-4);
    dots.fillStyle(PALETTE.SAND, 0.16);
    const dotStep = 26;
    for (let x = dotStep / 2; x < boardSize.width; x += dotStep) {
      for (let y = dotStep / 2; y < boardSize.height; y += dotStep) {
        dots.fillCircle(x, y, 1.3);
      }
    }

    // Structural grid lines.
    const grid = this.add.graphics().setPosition(ox, oy).setDepth(-4);
    grid.lineStyle(1, PALETTE.GOLD, 0.08);
    const step = 24;
    for (let x = step; x < boardSize.width; x += step) {
      grid.lineBetween(x, 0, x, boardSize.height);
    }
    for (let y = step; y < boardSize.height; y += step) {
      grid.lineBetween(0, y, boardSize.width, y);
    }

    // Scanlines for an arcane-device feel.
    const scan = this.add.graphics().setPosition(ox, oy).setDepth(-3);
    scan.fillStyle(0x000000, 0.1);
    for (let y = 0; y < boardSize.height; y += 4) {
      scan.fillRect(0, y, boardSize.width, 2);
    }

    // Inner vignette to focus the eye toward the center.
    const vignette = this.add.graphics().setPosition(ox, oy).setDepth(-3);
    const vSteps = 10;
    for (let i = 0; i < vSteps; i++) {
      const inset = (i / vSteps) * 28;
      const a = 0.08 * (i / vSteps);
      vignette.lineStyle(2, PALETTE.BORDER, a);
      vignette.strokeRect(inset, inset, boardSize.width - inset * 2, boardSize.height - inset * 2);
    }

    this.background = base;
    this.bgGlow = glow;
    this.bgGrid = grid;
    this.bgScan = scan;
    this.bgVignette = vignette;
    this.sweep = this.add.graphics().setDepth(-4).setPosition(ox, oy);
  }

  private animateBackground(delta: number): void {
    if (!this.sweep || this.prefersReducedMotion) return;
    const size = this.state.imageSize;
    const phase = (this.time.now / 2600) % 1;
    const y = phase * size.height;
    this.sweep.clear();
    this.sweep.lineStyle(2, PALETTE.CYAN, 0.16);
    this.sweep.lineBetween(0, y, size.width, y);
  }

  private renderOverlay(): void {
    if (this.state.won && this.overlayShown !== "win") {
      this.overlayShown = "win";
      this.overlayPanel?.setVisible(true);
      this.overlayText
        ?.setText("IMAGE SECURED")
        .setColor(PALETTE.css.GOLD)
        .setVisible(true);
      if (!this.prefersReducedMotion) {
        this.tweens.add({
          targets: this.overlayText,
          scale: { from: 0.7, to: 1 },
          duration: 420,
          ease: "Back.Out",
        });
      }
    } else if (this.state.gameOver && this.overlayShown !== "lose") {
      this.overlayShown = "lose";
      this.overlayPanel?.setVisible(true);
      this.overlayText
        ?.setText("SIGNAL LOST")
        .setColor(PALETTE.css.MAGENTA)
        .setVisible(true);
      if (!this.prefersReducedMotion) {
        this.tweens.add({
          targets: this.overlayText,
          alpha: { from: 0.2, to: 1 },
          duration: 500,
          ease: "Cubic.Out",
        });
      }
    }
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

    // Soft outer glow behind each panel so the HUD reads as a lit instrument.
    this.hudChrome.fillStyle(PALETTE.GOLD, 0.06);
    this.hudChrome.fillRoundedRect(frameLeft - 4, frameTop - 4, frameWidth + 8, HUD_FRAME_HEIGHT + 8, 10);
    this.hudChrome.fillStyle(PALETTE.SAND, 0.05);
    this.hudChrome.fillRoundedRect(sealLeft - 4, frameTop - 4, sealSize + 8, HUD_FRAME_HEIGHT + 8, 10);

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
    // Inner top highlight to give the panels a beveled, metallic sheen.
    this.hudChrome.lineStyle(1, PALETTE.WHITE, 0.08);
    this.hudChrome.lineBetween(frameLeft + 6, frameTop + 4, frameLeft + frameWidth - 6, frameTop + 4);
    this.hudChrome.lineBetween(sealLeft + 6, frameTop + 4, sealLeft + sealSize - 6, frameTop + 4);

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
