export function normalizeRetention(value) {
    return value === "7-days" || value === "30-days" ? value : "session";
}
export function buildUploadPolicy(retention) {
    return {
        retention,
        public: false,
        stripMetadata: true,
        maxSide: 1600,
        outputFormat: "webp",
    };
}
