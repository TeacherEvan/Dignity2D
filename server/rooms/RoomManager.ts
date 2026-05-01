export type RoomPlayer = { id: string; connected: boolean };

export type RoomState = {
  id: string;
  imageId: string;
  players: RoomPlayer[];
  stateVersion: number;
  createdAt: number;
};

export class RoomManager {
  private rooms = new Map<string, RoomState>();
  private nextRoom = 1;
  private nextPlayer = 1;

  createRoom(imageId: string): RoomState {
    const room: RoomState = {
      id: `room-${this.nextRoom++}`,
      imageId,
      players: [{ id: `p${this.nextPlayer++}`, connected: true }],
      stateVersion: 0,
      createdAt: Date.now()
    };
    this.rooms.set(room.id, room);
    return room;
  }

  joinRoom(roomId: string): RoomState | null {
    const room = this.rooms.get(roomId);
    if (!room || room.players.length >= 2) return null;
    room.players.push({ id: `p${this.nextPlayer++}`, connected: true });
    room.stateVersion += 1;
    return room;
  }

  getRoom(roomId: string): RoomState | null {
    return this.rooms.get(roomId) ?? null;
  }
}