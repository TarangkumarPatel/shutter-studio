import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { storage } from "./storage";

const WEB_MAX_DIMENSION = 2400;
const WEB_QUALITY = 82;
const BLUR_WIDTH = 16;

export interface ProcessedPhoto {
  storageKey: string;
  originalKey: string;
  width: number;
  height: number;
  blurDataUrl: string;
}

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

export function isAllowedImageType(mimeType: string): boolean {
  return ALLOWED_MIME.has(mimeType);
}

/**
 * Processes an uploaded image buffer into a web-optimized WebP (resized,
 * compressed — what the gallery serves) plus a preserved original, and
 * derives a base64 blur-up placeholder for next/image.
 */
export async function processUploadedPhoto(buffer: Buffer): Promise<ProcessedPhoto> {
  const id = randomUUID();
  const image = sharp(buffer, { failOn: "none" }).rotate(); // .rotate() auto-applies EXIF orientation

  const webBuffer = await image
    .clone()
    .resize({
      width: WEB_MAX_DIMENSION,
      height: WEB_MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: WEB_QUALITY })
    .toBuffer();

  const webMeta = await sharp(webBuffer).metadata();
  if (!webMeta.width || !webMeta.height) {
    throw new Error("Could not read processed image dimensions.");
  }

  const blurBuffer = await sharp(buffer)
    .rotate()
    .resize({ width: BLUR_WIDTH })
    .webp({ quality: 40 })
    .toBuffer();
  const blurDataUrl = `data:image/webp;base64,${blurBuffer.toString("base64")}`;

  // Preserve the original, EXIF orientation baked in, at high quality — not
  // resized, so it stays true to the source file the admin uploaded.
  const originalBuffer = await image.clone().jpeg({ quality: 95 }).toBuffer();

  const storageKey = await storage.save(`uploads/web/${id}.webp`, webBuffer);
  const originalKey = await storage.save(
    `uploads/originals/${id}.jpg`,
    originalBuffer,
  );

  return {
    storageKey,
    originalKey,
    width: webMeta.width,
    height: webMeta.height,
    blurDataUrl,
  };
}
