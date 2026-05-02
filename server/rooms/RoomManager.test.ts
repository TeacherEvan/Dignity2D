import { describe, expect, it } from "vitest";
import { RoomManager } from "./RoomManager";

describe("RoomManager", () => {
  it("creates guest room with one player", () => {
    const manager = new RoomManager();
    const room = manager.createRoom("img1");
    expect(room.players).toHaveLength(1);
    expect(room.imageId).toBe("img1");
  });

  it("allows second guest to join", () => {
    const manager = new RoomManager();
    const room = manager.createRoom("img1");
    const joined = manager.joinRoom(room.id);
    expect(joined?.players).toHaveLength(2);
  });

  it("rejects third guest for first co-op mode", () => {
    const manager = new RoomManager();
    const room = manager.createRoom("img1");
    manager.joinRoom(room.id);
    expect(manager.joinRoom(room.id)).toBeNull();
  });

  it("rejects a third player", () => {
    const manager = new RoomManager();
    const room = manager.createRoom("img-1");
    expect(manager.joinRoom(room.id)?.players).toHaveLength(2);
    expect(manager.joinRoom(room.id)).toBeNull();
  });

  it("increments state version when a second player joins", () => {
    const manager = new RoomManager();
    const room = manager.createRoom("img-1");
    expect(room.stateVersion).toBe(0);
    expect(manager.joinRoom(room.id)?.stateVersion).toBe(1);
  });
});
