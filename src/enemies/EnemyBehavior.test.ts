import { describe, expect, it } from "vitest";
import { chooseEnemyIntent, scaleEnemyPressure } from "./EnemyBehavior";

describe("EnemyBehavior", () => {
  it("chasers target active trails", () => {
    expect(
      chooseEnemyIntent("chaser", {
        activeTrailCount: 1,
        bothPlayersDrawing: false,
      }),
    ).toBe("hunt-trail");
  });

  it("keeps chasers on patrol when no trail is active", () => {
    expect(
      chooseEnemyIntent("chaser", {
        activeTrailCount: 0,
        bothPlayersDrawing: false,
      }),
    ).toBe("patrol");
  });

  it("shooters keep predictable lanes", () => {
    expect(
      chooseEnemyIntent("shooter", {
        activeTrailCount: 0,
        bothPlayersDrawing: false,
      }),
    ).toBe("fire-lane");
  });

  it("orbiters guard captured or high-value areas", () => {
    expect(
      chooseEnemyIntent("orbiter", {
        activeTrailCount: 0,
        bothPlayersDrawing: false,
      }),
    ).toBe("guard-area");
  });

  it("disruptors pressure co-op overextension", () => {
    expect(
      chooseEnemyIntent("disruptor", {
        activeTrailCount: 2,
        bothPlayersDrawing: true,
      }),
    ).toBe("disrupt-coop");
  });

  it("keeps disruptors on patrol when only one player is drawing", () => {
    expect(
      chooseEnemyIntent("disruptor", {
        activeTrailCount: 1,
        bothPlayersDrawing: false,
      }),
    ).toBe("patrol");
  });

  it("scales pressure when both co-op players draw", () => {
    expect(scaleEnemyPressure(30, { bothPlayersDrawing: true })).toBe(39);
  });

  it("keeps pressure unchanged during solo drawing", () => {
    expect(scaleEnemyPressure(30, { bothPlayersDrawing: false })).toBe(30);
  });
});
