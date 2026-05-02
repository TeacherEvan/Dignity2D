import { describe, expect, it } from "vitest";
import {
  MAX_RETENTION_DAYS,
  buildUploadPolicy,
  getRetentionExpiryTime,
  normalizeRetention,
} from "./processImage";

describe("processImage policy", () => {
  it("normalizes invalid retention to session", () => {
    expect(normalizeRetention("forever")).toBe("session");
    expect(normalizeRetention(`${MAX_RETENTION_DAYS + 1}-days`)).toBe(
      "session",
    );
  });

  it("accepts additional private day-based retention windows", () => {
    expect(normalizeRetention("14-days")).toBe("14-days");
    expect(getRetentionExpiryTime("14-days", 100)).toBe(
      100 + 14 * 24 * 60 * 60 * 1000,
    );
  });

  it("builds session policy without public visibility", () => {
    const policy = buildUploadPolicy("session");
    expect(policy.public).toBe(false);
    expect(policy.stripMetadata).toBe(true);
    expect(policy.maxSide).toBe(1600);
  });
});
