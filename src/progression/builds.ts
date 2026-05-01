export type PlayerClass =
  | "Guardian"
  | "Striker"
  | "Scout"
  | "Engineer"
  | "Trickster";

export type RankedTemplate = {
  playerClass: PlayerClass;
  powerBudget: number;
  gadgetSlots: number;
  passiveSlots: number;
};

const classes: PlayerClass[] = [
  "Guardian",
  "Striker",
  "Scout",
  "Engineer",
  "Trickster",
];

export function listClasses(): PlayerClass[] {
  return [...classes];
}

export function getRankedTemplate(playerClass: PlayerClass): RankedTemplate {
  return { playerClass, powerBudget: 100, gadgetSlots: 1, passiveSlots: 2 };
}
