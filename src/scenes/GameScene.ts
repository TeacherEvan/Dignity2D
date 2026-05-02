import Phaser from "phaser";
import { commitCaptureFromTrail } from "../game/capture/captureArea";
import { movePlayer } from "../game/capture/trailState";
import {
  cancelTrailOnProjectileHit,
  circleHitsPolyline,
} from "../game/collision";
import { createEnemyWave } from "../enemies/EnemySpawner";
import { calculateCaptureScore, hasWon } from "../game/scoring";
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
import { getTerritoryStage } from "../progression/territoryProgression";
import type { GameLaunchData } from "../session";
import { PALETTE } from "../theme/palette";
import { getPendingLaunchData } from "../session";

export const BOARD_SIZE = { width: 320, height: 480 } as const;

const PLAYER_ID = "p1";
const PLAYER_SPEED = 160;
const ENEMY_RADIUS = 12;

export type GameSceneFrameInput = {
  direction: Point;
  deltaMs: number;
  now: number;
  playerId?: string;
};

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

function awardCaptureScore(
  state: GameState,
  playerId: string,
  captureArea: number,
): GameState {
  const score = calculateCaptureScore({
    area: captureArea,
    dangerMultiplier: 1 + state.enemies.length * 0.1,
    streak: state.captures.length,
    coOpBonus: 0,
  });

  return {
    ...state,
    won: hasWon(state.revealedRatio),
    players: state.players.map((player) =>
      player.id === playerId
        ? { ...player, score: player.score + score }
        : player,
    ),
  };
}

export function createSceneGameState(levelId = "solo-default"): GameState {
  const state = createInitialGameState(
    levelId,
    BOARD_SIZE.width,
    BOARD_SIZE.height,
  );
  return {
    ...state,
    enemies: createEnemyWave(1, state.imageSize),
  };
}

export function advanceGameState(
  state: GameState,
  input: GameSceneFrameInput,
): GameState {
  const playerId = input.playerId ?? PLAYER_ID;
  const currentPlayer = state.players.find((player) => player.id === playerId);
  if (!currentPlayer) return state;

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
  if (!movedPlayer) return nextState;

  if (
    currentPlayer.mode === "drawing" &&
    movedPlayer.mode === "safe" &&
    movedPlayer.activeTrail
  ) {
    const polygon = movedPlayer.activeTrail.points.slice(0, -1);
    const captureArea =
      polygon.length >= 3
        ? Math.abs(
            polygon.reduce((sum, point, index) => {
              const nextPoint = polygon[(index + 1) % polygon.length];
              return sum + point.x * nextPoint.y - nextPoint.x * point.y;
            }, 0),
          ) / 2
        : 0;
    nextState = commitCaptureFromTrail(nextState, movedPlayer.activeTrail);
    if (captureArea > 0) {
      nextState = awardCaptureScore(nextState, playerId, captureArea);
    }
  }

  const activeTrail = nextState.players.find(
    (player) => player.id === playerId,
  )?.activeTrail;
  if (
    activeTrail &&
    nextState.enemies.some((enemy) =>
      circleHitsPolyline(enemy.position, ENEMY_RADIUS, activeTrail.points),
    )
  ) {
    nextState = cancelTrailOnProjectileHit(nextState, playerId);
  }

  return nextState;
}

export function makeSceneLaunchData(data: GameLaunchData): GameLaunchData {
  return { ...data };
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
    return `Room ${launchData.roomId}`;
  }
  if (launchData.imageId) {
    return `Image ${launchData.imageId}`;
  }
  return territoryLabel ?? `Enemies ${enemyCount}`;
}

export class GameScene extends Phaser.Scene {
  private state!: GameState;
  private readonly joystick = new VirtualJoystick();
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private boardOrigin = { x: 0, y: 0 };
  private revealText?: Phaser.GameObjects.Text;
  private scoreText?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;
  private captureGraphics?: Phaser.GameObjects.Graphics;
  private trailGraphics?: Phaser.GameObjects.Graphics;
  private playerMarker?: Phaser.GameObjects.Arc;
  private enemyMarkers: Phaser.GameObjects.Arc[] = [];
  private launchData: GameLaunchData = {};
  private previewFrame?: Phaser.GameObjects.Rectangle;
  private previewImage?: Phaser.GameObjects.Image;
  private previewLabel?: Phaser.GameObjects.Text;

  constructor() {
    super("GameScene");
  }

  init(data: GameLaunchData): void {
    this.launchData = makeSceneLaunchData({
      ...getPendingLaunchData(),
      ...data,
    });
  }

  preload(): void {
    if (this.launchData.imageUrl) {
      this.load.image("selected-preview", this.launchData.imageUrl);
    }
  }

  create(): void {
    this.state = createSceneGameState(this.launchData.levelId);
    this.cursors = this.input.keyboard?.createCursorKeys();

    const maskSize = makeMaskResolution(
      BOARD_SIZE.width,
      BOARD_SIZE.height,
      640,
    );
    this.boardOrigin = {
      x: Math.round((this.scale.width - maskSize.width) / 2),
      y: 156,
    };

    this.add
      .rectangle(
        this.boardOrigin.x + BOARD_SIZE.width / 2,
        this.boardOrigin.y + BOARD_SIZE.height / 2,
        BOARD_SIZE.width,
        BOARD_SIZE.height,
        PALETTE.VOID,
      )
      .setStrokeStyle(3, PALETTE.GOLD);

    this.previewFrame = this.add
      .rectangle(
        this.boardOrigin.x + BOARD_SIZE.width / 2,
        110,
        150,
        84,
        PALETTE.BORDER,
      )
      .setStrokeStyle(2, PALETTE.SAND);
    if (this.launchData.imageUrl && this.textures.exists("selected-preview")) {
      this.previewImage = this.add.image(
        this.boardOrigin.x + BOARD_SIZE.width / 2,
        110,
        "selected-preview",
      );
      this.previewImage.setDisplaySize(142, 76);
    }
    this.previewLabel = this.add
      .text(
        this.boardOrigin.x + BOARD_SIZE.width / 2,
        66,
        this.launchData.imageUrl ? "Uploaded preview" : "Default hidden image",
        {
          color: PALETTE.css.SAND,
          fontSize: "14px",
        },
      )
      .setOrigin(0.5);

    this.captureGraphics = this.add.graphics();
    this.trailGraphics = this.add.graphics();
    this.playerMarker = this.add.circle(0, 0, 8, PALETTE.CYAN);
    this.enemyMarkers = this.state.enemies.map(() =>
      this.add.circle(0, 0, 10, PALETTE.AMBER),
    );

    this.revealText = this.add.text(24, 24, calculateRevealPercentText(0), {
      color: PALETTE.css.CYAN,
      fontSize: "18px",
    });
    this.scoreText = this.add.text(24, 52, "Score 0", {
      color: PALETTE.css.GOLD,
      fontSize: "18px",
    });
    this.statusText = this.add.text(
      24,
      80,
      `Mask ${maskSize.width}x${maskSize.height}`,
      {
        color: PALETTE.css.SAND,
        fontSize: "16px",
      },
    );

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown) return;
      this.joystick.setDirection({
        x: pointer.x - (this.boardOrigin.x + BOARD_SIZE.width / 2),
        y: pointer.y - (this.boardOrigin.y + BOARD_SIZE.height / 2),
      });
    });
    this.input.on("pointerup", () => {
      this.joystick.setDirection({ x: 0, y: 0 });
    });

    this.renderState();
  }

  update(time: number, delta: number): void {
    const keyboardDirection = this.getKeyboardDirection();
    const direction =
      keyboardDirection.x !== 0 || keyboardDirection.y !== 0
        ? keyboardDirection
        : this.joystick.getDirection();

    this.state = advanceGameState(this.state, {
      direction,
      deltaMs: delta,
      now: time,
    });
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

    this.state.enemies.forEach((enemy, index) => {
      const marker = this.enemyMarkers[index];
      if (!marker) return;
      const position = this.toScreen(enemy.position);
      marker.setPosition(position.x, position.y);
    });

    this.revealText?.setText(
      calculateRevealPercentText(this.state.revealedRatio),
    );
    this.scoreText?.setText(`Score ${player.score}`);
    const territoryStage = getTerritoryStage(this.state.revealedRatio);
    this.statusText?.setText(
      makeGameStatusText(
        this.launchData,
        this.state.won,
        this.state.enemies.length,
        territoryStage.label,
      ),
    );
  }
}
