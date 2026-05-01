export type UploadRetention = "session" | "7-days" | "30-days";

export const DEFAULT_RETENTION: UploadRetention = "session";
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function isAcceptedImageType(type: string): boolean {
  return type === "image/png" || type === "image/jpeg" || type === "image/webp";
}

export function validateUploadSize(sizeBytes: number): {
  ok: boolean;
  message: string;
} {
  if (sizeBytes > MAX_UPLOAD_BYTES)
    return { ok: false, message: "Image is too large." };
  return { ok: true, message: "" };
}
