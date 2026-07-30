"use client";

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.86;

export interface ResizedImage {
  base64: string;
  mediaType: "image/jpeg";
  previewUrl: string;
}

/**
 * Resizes an uploaded image client-side (via canvas) before it's sent to the
 * judge API — keeps the request payload small and normalizes the format.
 * The result lives entirely in memory; nothing here touches the network
 * except the eventual /api/game/judge call, and that call never persists it.
 */
export function resizeImageForUpload(file: File): Promise<ResizedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That doesn't look like a valid image."));
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          const scale = MAX_DIMENSION / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas isn't supported in this browser."));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
        const base64 = dataUrl.split(",")[1] ?? "";
        resolve({ base64, mediaType: "image/jpeg", previewUrl: dataUrl });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
