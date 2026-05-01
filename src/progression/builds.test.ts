import { describe, expect, it } from "vitest";
import { getRankedTemplate, listClasses } from "./builds";

describe("builds", () => {
  it("lists five approved classes", () => {
    expect(listClasses()).toEqual([
      "Guardian",
      "Striker",
      "Scout",
      "Engineer",
      "Trickster",
    ]);
  });

  it("normalizes ranked template power", () => {
    expect(getRankedTemplate("Guardian").powerBudget).toBe(100);
    expect(getRankedTemplate("Trickster").powerBudget).toBe(100);
  });
});
