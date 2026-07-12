export type HudSnapshot = {
  score: number;
  revealedRatio: number;
  statusText: string;
  captureCount: number;
  won: boolean;
};

export type HudFeedback = {
  pulseReveal: boolean;
  pulseScore: boolean;
  pulseStatus: boolean;
  captureCue: boolean;
};

export function deriveHudFeedback(
  previous: HudSnapshot | null,
  next: HudSnapshot,
): HudFeedback {
  if (!previous) {
    return {
      pulseReveal: false,
      pulseScore: false,
      pulseStatus: false,
      captureCue: false,
    };
  }

  const pulseReveal = next.revealedRatio > previous.revealedRatio;
  const pulseScore = next.score > previous.score;
  const pulseStatus = next.statusText !== previous.statusText;
  const captureCue =
    next.captureCount > previous.captureCount || (next.won && !previous.won);

  return {
    pulseReveal,
    pulseScore,
    pulseStatus,
    captureCue,
  };
}
