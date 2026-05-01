export function calculateRevealPercentText(revealedRatio: number): string {
  return `Reveal ${Math.floor(revealedRatio * 100)}%`;
}

export function makeMaskResolution(
  width: number,
  height: number,
  maxSide: number,
): { width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}
