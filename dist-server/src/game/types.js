export function createInitialGameState(levelId, width, height) {
    const start = { x: 0, y: 0 };
    return {
        levelId,
        imageSize: { width, height },
        revealedRatio: 0,
        players: [
            {
                id: "p1",
                position: start,
                lastSafePosition: start,
                mode: "safe",
                health: 3,
                score: 0,
                activeTrail: null,
            },
        ],
        captures: [],
        enemies: [],
        projectiles: [],
        won: false,
    };
}
