import type { DeviceClass } from "./DisplayProfile";

export type Handedness = "left" | "right";

export type LayoutPreference = {
  layoutId: string;
  joystickScale: number;
  handedness: Handedness;
};

function keyFor(deviceClass: DeviceClass): string {
  return `dignity.layout.${deviceClass}.v1`;
}

function isHandedness(value: unknown): value is Handedness {
  return value === "left" || value === "right";
}

export function loadLayoutPreference(
  deviceClass: DeviceClass,
): LayoutPreference | null {
  try {
    const raw = localStorage.getItem(keyFor(deviceClass));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LayoutPreference>;
    if (
      typeof parsed.layoutId !== "string" ||
      typeof parsed.joystickScale !== "number" ||
      !isHandedness(parsed.handedness)
    ) {
      return null;
    }
    return {
      layoutId: parsed.layoutId,
      joystickScale: parsed.joystickScale,
      handedness: parsed.handedness,
    };
  } catch {
    return null;
  }
}

export function saveLayoutPreference(
  deviceClass: DeviceClass,
  preference: LayoutPreference,
): void {
  localStorage.setItem(keyFor(deviceClass), JSON.stringify(preference));
}
