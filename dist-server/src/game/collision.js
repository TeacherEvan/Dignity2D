import { cancelTrail } from "./capture/trailState";
function distanceToSegment(point, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSq = dx * dx + dy * dy;
    if (lengthSq === 0)
        return Math.hypot(point.x - a.x, point.y - a.y);
    const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq));
    return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}
export function circleHitsPolyline(center, radius, points) {
    for (let i = 1; i < points.length; i++) {
        if (distanceToSegment(center, points[i - 1], points[i]) <= radius)
            return true;
    }
    return false;
}
export function cancelTrailOnProjectileHit(state, playerId) {
    return cancelTrail(state, playerId);
}
