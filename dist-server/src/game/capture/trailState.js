import { isSafePoint } from "../geometry/border";
function replacePlayer(state, player) {
    return {
        ...state,
        players: state.players.map((item) => item.id === player.id ? player : item),
    };
}
export function movePlayer(state, playerId, position, timestamp) {
    const player = state.players.find((item) => item.id === playerId);
    if (!player)
        return state;
    const capturePolygons = state.captures.map((capture) => capture.polygon);
    const safe = isSafePoint(position, state.imageSize, capturePolygons);
    if (player.mode === "drawing") {
        const trail = {
            ...player.activeTrail,
            points: [...player.activeTrail.points, position],
        };
        const nextPlayer = safe
            ? {
                ...player,
                position,
                lastSafePosition: position,
                mode: "safe",
                activeTrail: trail,
            }
            : { ...player, position, mode: "drawing", activeTrail: trail };
        return replacePlayer(state, nextPlayer);
    }
    if (safe) {
        return replacePlayer(state, {
            ...player,
            position,
            lastSafePosition: position,
            mode: "safe",
            activeTrail: null,
        });
    }
    return replacePlayer(state, {
        ...player,
        position,
        mode: "drawing",
        activeTrail: {
            playerId,
            points: [player.lastSafePosition, position],
            startedAt: timestamp,
        },
    });
}
export function cancelTrail(state, playerId) {
    const player = state.players.find((item) => item.id === playerId);
    if (!player)
        return state;
    return replacePlayer(state, {
        ...player,
        position: player.lastSafePosition,
        mode: "safe",
        activeTrail: null,
    });
}
