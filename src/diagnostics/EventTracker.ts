export type DiagnosticEventName =
  | "welcome_viewed"
  | "display_detected"
  | "layout_loaded"
  | "layout_saved"
  | "solo_started"
  | "multiplayer_started"
  | "room_created"
  | "room_joined"
  | "capture_committed"
  | "trail_cancelled"
  | "enemy_collision"
  | "performance_fallback";

export type DiagnosticPayload = Record<string, string | number | boolean>;

export type DiagnosticEvent = {
  name: DiagnosticEventName;
  at: number;
  payload: DiagnosticPayload;
};

const allowedNames = new Set<DiagnosticEventName>([
  "welcome_viewed",
  "display_detected",
  "layout_loaded",
  "layout_saved",
  "solo_started",
  "multiplayer_started",
  "room_created",
  "room_joined",
  "capture_committed",
  "trail_cancelled",
  "enemy_collision",
  "performance_fallback",
]);

const allowedPayloadKeys = new Set([
  "deviceClass",
  "orientation",
  "compactHud",
  "layoutId",
  "mode",
  "enemyKind",
  "revealedRatio",
  "stateVersion",
  "reason",
]);

export function createEventTracker(
  options: {
    now?: () => number;
    sink?: (events: DiagnosticEvent[]) => void;
    maxEvents?: number;
  } = {},
) {
  const now = options.now ?? Date.now;
  const sink = options.sink ?? (() => undefined);
  const maxEvents = options.maxEvents ?? 100;
  const events: DiagnosticEvent[] = [];

  return {
    track(name: DiagnosticEventName, payload: DiagnosticPayload = {}) {
      if (!allowedNames.has(name)) {
        throw new Error("Unsupported diagnostic event.");
      }

      const safePayload = Object.fromEntries(
        Object.entries(payload).filter(([key]) => allowedPayloadKeys.has(key)),
      ) as DiagnosticPayload;

      events.push({ name, at: now(), payload: safePayload });
      while (events.length > maxEvents) {
        events.shift();
      }
    },
    snapshot() {
      return [...events];
    },
    flush() {
      if (events.length === 0) {
        return;
      }

      sink([...events]);
      events.length = 0;
    },
  };
}
