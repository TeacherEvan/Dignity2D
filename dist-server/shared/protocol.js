export function isClientMessage(value) {
    if (!value || typeof value !== "object")
        return false;
    const type = value.type;
    return (type === "create-room" ||
        type === "join-room" ||
        type === "input-frame" ||
        type === "capture-proposal" ||
        type === "reconnect");
}
export function makeRoomCreated(roomId) {
    return { type: "room-created", roomId };
}
