export class RoomManager {
    rooms = new Map();
    nextRoom = 1;
    nextPlayer = 1;
    createRoom(imageId) {
        const room = {
            id: `room-${this.nextRoom++}`,
            imageId,
            players: [{ id: `p${this.nextPlayer++}`, connected: true }],
            stateVersion: 0,
            createdAt: Date.now(),
        };
        this.rooms.set(room.id, room);
        return room;
    }
    joinRoom(roomId) {
        const room = this.rooms.get(roomId);
        if (!room || room.players.length >= 2)
            return null;
        room.players.push({ id: `p${this.nextPlayer++}`, connected: true });
        room.stateVersion += 1;
        return room;
    }
    getRoom(roomId) {
        return this.rooms.get(roomId) ?? null;
    }
}
