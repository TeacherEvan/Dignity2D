import sharp from "sharp";
export async function transformImage(input, policy) {
    return sharp(input)
        .rotate()
        .resize({
        width: policy.maxSide,
        height: policy.maxSide,
        fit: "inside",
        withoutEnlargement: true,
    })
        .webp({ quality: 82 })
        .toBuffer();
}
