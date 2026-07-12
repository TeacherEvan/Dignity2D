import type { EnemyKind } from "../game/types";

export type EnemyVisual = {
  color: number;
  css: string;
  glyph: string;
  label: string;
};

export const ENEMY_VISUALS: Record<EnemyKind, EnemyVisual> = {
  chaser: { color: 0xff00cc, css: "#FF00CC", glyph: "▲", label: "Chaser" },
  shooter: { color: 0x00ffff, css: "#00FFFF", glyph: "◆", label: "Shooter" },
  orbiter: { color: 0xc8a96e, css: "#C8A96E", glyph: "◎", label: "Orbiter" },
  disruptor: {
    color: 0xff8c00,
    css: "#FF8C00",
    glyph: "✕",
    label: "Disruptor",
  },
};

export function enemyColor(kind: EnemyKind): number {
  return ENEMY_VISUALS[kind].color;
}

export function enemyGlyph(kind: EnemyKind): string {
  return ENEMY_VISUALS[kind].glyph;
}

export function enemyLabel(kind: EnemyKind): string {
  return ENEMY_VISUALS[kind].label;
}
