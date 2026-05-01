import { isClosedTrail } from "../../src/game/capture/captureArea";
function samePoint(a, b, tolerance = 1) {
    return Math.abs(a.x - b.x) <= tolerance && Math.abs(a.y - b.y) <= tolerance;
}
export function mergeCoOpTrails(a, b) {
    const aEnd = a.points[a.points.length - 1];
    const bStart = b.points[0];
    if (!samePoint(aEnd, bStart))
        return null;
    return {
        playerId: "coop",
        startedAt: Math.min(a.startedAt, b.startedAt),
        points: [...a.points, ...b.points.slice(1)],
    };
}
export function canCommitCoOpCapture(trail) {
    return isClosedTrail(trail);
}
