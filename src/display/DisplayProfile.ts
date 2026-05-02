export type DisplayInput = {
  width: number;
  height: number;
  devicePixelRatio: number;
};

export type DeviceClass = "phone" | "tablet" | "desktop";
export type Orientation = "portrait" | "landscape";

export type DisplayProfile = {
  width: number;
  height: number;
  devicePixelRatio: number;
  deviceClass: DeviceClass;
  orientation: Orientation;
  compactHud: boolean;
};

type WindowLike = {
  innerWidth: number;
  innerHeight: number;
  devicePixelRatio?: number;
  visualViewport?: { width: number; height: number } | null;
};

export function detectDisplayProfile(input: DisplayInput): DisplayProfile {
  const width = Math.max(1, Math.round(input.width));
  const height = Math.max(1, Math.round(input.height));
  const shortest = Math.min(width, height);
  const longest = Math.max(width, height);
  const deviceClass: DeviceClass =
    shortest < 600 ? "phone" : longest < 1200 ? "tablet" : "desktop";

  return {
    width,
    height,
    devicePixelRatio: Math.max(1, input.devicePixelRatio),
    deviceClass,
    orientation: height >= width ? "portrait" : "landscape",
    compactHud: shortest < 420 || height < 720,
  };
}

export function readDisplayProfileFromWindow(source: WindowLike = window): DisplayProfile {
  return detectDisplayProfile({
    width: source.visualViewport?.width ?? source.innerWidth,
    height: source.visualViewport?.height ?? source.innerHeight,
    devicePixelRatio: source.devicePixelRatio ?? 1,
  });
}