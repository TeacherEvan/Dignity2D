export type TerritoryStage = {
  id: "border-camp" | "safe-quarter" | "inner-district" | "image-secured";
  label: string;
  threshold: number;
};

const stages: TerritoryStage[] = [
  { id: "border-camp", label: "Border Camp", threshold: 0 },
  { id: "safe-quarter", label: "Safe Quarter", threshold: 0.25 },
  { id: "inner-district", label: "Inner District", threshold: 0.5 },
  { id: "image-secured", label: "Image Secured", threshold: 0.75 },
];

export function listTerritoryMilestones(): TerritoryStage[] {
  return [...stages];
}

export function getTerritoryStage(revealedRatio: number): TerritoryStage {
  const clamped = Math.max(0, Math.min(1, revealedRatio));
  return stages.reduce((current, stage) =>
    clamped >= stage.threshold ? stage : current,
  );
}
