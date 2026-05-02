import { describe, expect, it } from "vitest";
import { isClientMessage, makeRoomCreated } from "./protocol";

describe("protocol", () => {
  it("accepts create room messages", () => {
    expect(isClientMessage({ type: "create-room", imageId: "img1" })).toBe(
      true,
    );
  });

  it("rejects create room messages without an image id", () => {
    expect(isClientMessage({ type: "create-room" })).toBe(false);
  });

  it("rejects malformed input frame messages", () => {
    expect(
      isClientMessage({
        type: "input-frame",
        roomId: "room-1",
        playerId: "p1",
        direction: { x: "bad", y: 0 },
        sequence: 1,
      }),
    ).toBe(false);
  });

  it("rejects malformed capture proposals", () => {
    expect(
      isClientMessage({
        type: "capture-proposal",
        roomId: "room-1",
        playerId: "p1",
        trail: { playerId: "p1", startedAt: 0, points: [{ x: 1 }] },
      }),
    ).toBe(false);
  });

  it("rejects unknown messages", () => {
    expect(isClientMessage({ type: "bad" })).toBe(false);
  });

  it("creates room-created server message", () => {
    expect(makeRoomCreated("room1").type).toBe("room-created");
  });
});
