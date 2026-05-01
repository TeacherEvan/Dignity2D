const raw = {
  GOLD: 0xFFD700,
  CYAN: 0x00FFFF,
  VOID: 0x0A0812,
  BORDER: 0x1A1428,
  AMBER: 0xFF8C00,
  MAGENTA: 0xFF00CC,
  SAND: 0xC8A96E,
  WHITE: 0xFFFFFF
} as const;

function toCss(value: number): string {
  return `#${value.toString(16).toUpperCase().padStart(6, '0')}`;
}

export const PALETTE = {
  ...raw,
  css: Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, toCss(value)])) as Record<keyof typeof raw, string>
};