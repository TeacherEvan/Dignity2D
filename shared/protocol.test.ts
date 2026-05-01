import { describe, expect, it } from "vitest";
import { isClientMessage, makeRoomCreated } from "./protocol";

describe("protocol", () => {
  it("accepts create room messages", () => {
    expect(isClientMessage({ type: "create-room", imageId: "img1" })).toBe(
      true,
    );
  });

  it("rejects unknown messages", () => {
    expect(isClientMessage({ type: "bad" })).toBe(false);
  });

  it("creates room-created server message", () => {
    expect(makeRoomCreated("room1").type).toBe("room-created");
  });
});
