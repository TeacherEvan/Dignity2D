import { describe, expect, it } from "vitest";
import {
  getTerritoryStage,
  listTerritoryMilestones,
} from "./territoryProgression";

describe("territoryProgression", () => {
  it("starts at border camp", () => {
    expect(getTerritoryStage(0).id).toBe("border-camp");
  });

  it("advances at 25 percent reveal", () => {
    expect(getTerritoryStage(0.25).id).toBe("safe-quarter");
  });

  it("advances at 50 percent reveal", () => {
    expect(getTerritoryStage(0.5).id).toBe("inner-district");
  });

  it("marks 75 percent as secured", () => {
    expect(getTerritoryStage(0.75).id).toBe("image-secured");
  });

  it("clamps values above full reveal", () => {
    expect(getTerritoryStage(2).id).toBe("image-secured");
  });

  it("clamps negative reveal to the first milestone", () => {
    expect(getTerritoryStage(-0.2).id).toBe("border-camp");
  });

  it("lists milestones in ascending order", () => {
    expect(listTerritoryMilestones().map((item) => item.threshold)).toEqual([
      0, 0.25, 0.5, 0.75,
    ]);
  });

  it("returns a defensive copy of the milestone list", () => {
    const first = listTerritoryMilestones();
    first[0] = { id: "image-secured", label: "Changed", threshold: 1 };

    expect(listTerritoryMilestones()[0]).toEqual({
      id: "border-camp",
      label: "Border Camp",
      threshold: 0,
    });
  });
});
