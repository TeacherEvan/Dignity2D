import { PALETTE } from "./palette";

export type TrailStyle = {
  primary: number;
  partner: number;
  width: number;
  glowRadius: number;
  useShader: boolean;
};

export function createTrailStyle(reducedEffects: boolean): TrailStyle {
  return {
    primary: PALETTE.GOLD,
    partner: PALETTE.CYAN,
    width: 5,
    glowRadius: reducedEffects ? 0 : 0.005,
    useShader: !reducedEffects,
  };
}
