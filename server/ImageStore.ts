import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { getRetentionExpiryTime, type Retention } from "./upload/processImage";

export type StoredImage = {
  id: string;
  buffer: Buffer;
  contentType: string;
  bytes: number;
  retention: Retention;
  accessToken: string;
  createdAt: number;
  expiresAt: number;
};

export class ImageStore {
  private readonly images = new Map<string, StoredImage>();
  private readonly expiryTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();

  constructor(private readonly now: () => number = Date.now) {}

  private clearExpiryTimer(imageId: string): void {
    const timer = this.expiryTimers.get(imageId);
    if (!timer) {
      return;
    }
    clearTimeout(timer);
    this.expiryTimers.delete(imageId);
  }

  private deleteImage(imageId: string): void {
    this.clearExpiryTimer(imageId);
    this.images.delete(imageId);
  }

  private scheduleExpiry(image: StoredImage): void {
    const delayMs = Math.max(0, image.expiresAt - this.now());
    const timer = setTimeout(() => {
      this.expiryTimers.delete(image.id);
      this.images.delete(image.id);
    }, delayMs);
    this.expiryTimers.set(image.id, timer);
  }

  private cleanupExpired(): void {
    const currentTime = this.now();
    for (const [id, image] of this.images.entries()) {
      if (image.expiresAt <= currentTime) {
        this.deleteImage(id);
      }
    }
  }

  private matchesAccessToken(expected: string, provided: string): boolean {
    const expectedBuffer = Buffer.from(expected, "utf8");
    const providedBuffer = Buffer.from(provided, "utf8");
    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }
    return timingSafeEqual(expectedBuffer, providedBuffer);
  }

  save(
    buffer: Buffer,
    retention: Retention,
    contentType = "image/webp",
  ): StoredImage {
    this.cleanupExpired();
    const createdAt = this.now();
    const image: StoredImage = {
      id: randomUUID(),
      buffer,
      contentType,
      bytes: buffer.length,
      retention,
      accessToken: randomBytes(24).toString("hex"),
      createdAt,
      expiresAt: getRetentionExpiryTime(retention, createdAt),
    };
    this.images.set(image.id, image);
    this.scheduleExpiry(image);
    return image;
  }

  get(imageId: string): StoredImage | null {
    this.cleanupExpired();
    return this.images.get(imageId) ?? null;
  }

  getAuthorized(imageId: string, accessToken: string): StoredImage | null {
    const stored = this.get(imageId);
    if (!stored) {
      return null;
    }

    return this.matchesAccessToken(stored.accessToken, accessToken)
      ? stored
      : null;
  }

  dispose(): void {
    for (const imageId of this.expiryTimers.keys()) {
      this.clearExpiryTimer(imageId);
    }
  }
}
