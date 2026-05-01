export type StoredImage = {
  id: string;
  buffer: Buffer;
  contentType: string;
  bytes: number;
  retention: string;
};

export class ImageStore {
  private readonly images = new Map<string, StoredImage>();
  private nextId = 1;

  save(
    buffer: Buffer,
    retention: string,
    contentType = "image/webp",
  ): StoredImage {
    const image: StoredImage = {
      id: `image-${this.nextId++}`,
      buffer,
      contentType,
      bytes: buffer.length,
      retention,
    };
    this.images.set(image.id, image);
    return image;
  }

  get(imageId: string): StoredImage | null {
    return this.images.get(imageId) ?? null;
  }
}
