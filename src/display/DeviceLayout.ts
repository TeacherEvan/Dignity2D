import type { DeviceClass, Orientation } from "./DisplayProfile";
import type { LayoutPreference } from "./LayoutPreferences";

export type LayoutAnchor =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export type StandardLayout = {
  id: string;
  board: { maxWidth: number; maxHeight: number };
  joystick: { anchor: LayoutAnchor; size: number };
  ability: { anchor: LayoutAnchor; size: number };
  hud: { compact: boolean; topOffset: number };
};

export type LayoutContext = {
  deviceClass: DeviceClass;
  orientation: Orientation;
  compactHud: boolean;
};

function clampScale(scale: number): number {
  return Math.max(0.8, Math.min(1.5, scale));
}

export function getStandardLayout(input: LayoutContext): StandardLayout {
  if (input.deviceClass === "desktop") {
    return {
      id: "desktop-standard",
      board: { maxWidth: 720, maxHeight: 720 },
      joystick: { anchor: "bottom-left", size: 112 },
      ability: { anchor: "bottom-right", size: 88 },
      hud: { compact: false, topOffset: 24 },
    };
  }

  if (input.deviceClass === "tablet") {
    return {
      id: `${input.orientation}-tablet-standard`,
      board: { maxWidth: 600, maxHeight: 760 },
      joystick: { anchor: "bottom-left", size: 112 },
      ability: { anchor: "bottom-right", size: 88 },
      hud: { compact: input.compactHud, topOffset: 22 },
    };
  }

  return {
    id: `${input.orientation}-phone-standard`,
    board: {
      maxWidth: input.orientation === "portrait" ? 390 : 620,
      maxHeight: input.orientation === "portrait" ? 560 : 360,
    },
    joystick: { anchor: "bottom-left", size: 96 },
    ability: { anchor: "bottom-right", size: 76 },
    hud: { compact: true, topOffset: 18 },
  };
}

export function resolveLayoutWithPreference(
  input: LayoutContext,
  preference: LayoutPreference | null,
): StandardLayout {
  const base = getStandardLayout(input);
  if (!preference || preference.layoutId !== base.id) {
    return base;
  }

  const rightHanded = preference.handedness === "right";
  return {
    ...base,
    joystick: {
      ...base.joystick,
      anchor: rightHanded ? "bottom-right" : "bottom-left",
      size: Math.round(
        base.joystick.size * clampScale(preference.joystickScale),
      ),
    },
    ability: {
      ...base.ability,
      anchor: rightHanded ? "bottom-left" : "bottom-right",
    },
  };
}
