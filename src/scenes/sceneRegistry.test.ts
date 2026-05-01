import { describe, expect, it, vi } from "vitest";

vi.mock("phaser", () => ({
  default: {
    Scene: class {},
  },
}));

import { sceneRegistry } from "./sceneRegistry";

describe("sceneRegistry", () => {
  it("contains only the gameplay scene in the deferred Phaser bundle", () => {
    expect(sceneRegistry.map((scene) => scene.key)).toEqual([
      "GameScene",
    ]);
  });
});
