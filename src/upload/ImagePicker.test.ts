import { describe, expect, it } from "vitest";
import {
  DEFAULT_RETENTION,
  isAcceptedImageType,
  validateUploadSize,
} from "./ImagePicker";

describe("ImagePicker", () => {
  it("defaults retention to session only", () => {
    expect(DEFAULT_RETENTION).toBe("session");
  });

  it("accepts png jpeg and webp", () => {
    expect(isAcceptedImageType("image/png")).toBe(true);
    expect(isAcceptedImageType("image/jpeg")).toBe(true);
    expect(isAcceptedImageType("image/webp")).toBe(true);
  });

  it("rejects svg and oversized files", () => {
    expect(isAcceptedImageType("image/svg+xml")).toBe(false);
    expect(validateUploadSize(11 * 1024 * 1024).ok).toBe(false);
  });
});
