export function isOnOuterBorder(point, size, tolerance = 1) {
    const onLeft = Math.abs(point.x) <= tolerance;
    const onRight = Math.abs(point.x - size.width) <= tolerance;
    const onTop = Math.abs(point.y) <= tolerance;
    const onBottom = Math.abs(point.y - size.height) <= tolerance;
    return onLeft || onRight || onTop || onBottom;
}
export function isPointInPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const a = polygon[i];
        const b = polygon[j];
        const intersects = a.y > point.y !== b.y > point.y &&
            point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
        if (intersects)
            inside = !inside;
    }
    return inside;
}
export function isSafePoint(point, size, captures) {
    return (isOnOuterBorder(point, size) ||
        captures.some((polygon) => isPointInPolygon(point, polygon)));
}
