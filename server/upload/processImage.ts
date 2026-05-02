export type Retention = "session" | `${number}-days`;

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_RETENTION_DAYS = 30;

const SESSION_RETENTION_MS = 6 * 60 * 60 * 1000;
const DAY_RETENTION_PATTERN = /^([1-9]\d*)-days$/;

export type UploadPolicy = {
  retention: Retention;
  public: boolean;
  stripMetadata: boolean;
  maxSide: number;
  outputFormat: "webp";
};

function parseRetentionDays(value: string): number | null {
  const match = DAY_RETENTION_PATTERN.exec(value);
  if (!match) {
    return null;
  }

  const days = Number(match[1]);
  if (!Number.isInteger(days) || days < 1 || days > MAX_RETENTION_DAYS) {
    return null;
  }

  return days;
}

export function normalizeRetention(value: string): Retention {
  if (value === "session") {
    return value;
  }

  const days = parseRetentionDays(value);
  return days === null ? "session" : `${days}-days`;
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

export function getRetentionExpiryTime(
  retention: Retention,
  now = Date.now(),
): number {
  if (retention === "session") {
    return now + SESSION_RETENTION_MS;
  }

  const days = parseRetentionDays(retention);
  return now + (days ?? 0) * 24 * 60 * 60 * 1000;
}
