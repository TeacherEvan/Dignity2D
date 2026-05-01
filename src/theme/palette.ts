const raw = {
  GOLD: 0xffd700,
  CYAN: 0x00ffff,
  VOID: 0x0a0812,
  BORDER: 0x1a1428,
  AMBER: 0xff8c00,
  MAGENTA: 0xff00cc,
  SAND: 0xc8a96e,
  WHITE: 0xffffff,
} as const;

function toCss(value: number): string {
  return `#${value.toString(16).toUpperCase().padStart(6, "0")}`;
}

export const PALETTE = {
  ...raw,
  css: Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, toCss(value)]),
  ) as Record<keyof typeof raw, string>,
};
