import sharp from 'sharp';
import type { UploadPolicy } from './processImage';

export async function transformImage(input: Buffer, policy: UploadPolicy): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize({ width: policy.maxSide, height: policy.maxSide, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
}