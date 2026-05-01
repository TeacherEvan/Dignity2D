export function calculatePolygonArea(points) {
    if (points.length < 3)
        return 0;
    let sum = 0;
    for (let i = 0; i < points.length; i++) {
        const current = points[i];
        const next = points[(i + 1) % points.length];
        sum += current.x * next.y - next.x * current.y;
    }
    return Math.abs(sum) / 2;
}
export function isClosedTrail(trail, tolerance = 1) {
    const first = trail.points[0];
    const last = trail.points[trail.points.length - 1];
    return (Math.abs(first.x - last.x) <= tolerance &&
        Math.abs(first.y - last.y) <= tolerance);
}
export function commitCaptureFromTrail(state, trail) {
    if (!isClosedTrail(trail))
        return state;
    const polygon = trail.points.slice(0, -1);
    const area = calculatePolygonArea(polygon);
    if (area <= 0)
        return state;
    const capture = {
        id: `capture-${state.captures.length + 1}`,
        polygon,
        area,
    };
    const totalArea = state.imageSize.width * state.imageSize.height;
    const revealedArea = state.captures.reduce((sum, item) => sum + item.area, 0) + area;
    return {
        ...state,
        captures: [...state.captures, capture],
        revealedRatio: Math.min(1, revealedArea / totalArea),
        players: state.players.map((player) => player.id === trail.playerId
            ? { ...player, mode: "safe", activeTrail: null }
            : player),
    };
}
