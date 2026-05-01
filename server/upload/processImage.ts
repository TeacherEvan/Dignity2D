export type Retention = "session" | "7-days" | "30-days";

export type UploadPolicy = {
  retention: Retention;
  public: boolean;
  stripMetadata: boolean;
  maxSide: number;
  outputFormat: "webp";
};

export function normalizeRetention(value: string): Retention {
  return value === "7-days" || value === "30-days" ? value : "session";
}

export function buildUploadPolicy(retention: Retention): UploadPolicy {
  return {
    retention,
    public: false,
    stripMetadata: true,
    maxSide: 1600,
    outputFormat: "webp",
  };
}
