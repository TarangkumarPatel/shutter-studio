"use client";

import { useRef, useState } from "react";
import { resizeImageForUpload, type ResizedImage } from "@/lib/clientImage";

export default function ChallengeUpload({
  onReady,
}: {
  onReady: (image: ResizedImage | null) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | null) {
    setError(null);
    if (!file) {
      setPreview(null);
      onReady(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    setProcessing(true);
    try {
      const resized = await resizeImageForUpload(file);
      setPreview(resized.previewUrl);
      onReady(resized);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't process that image.");
      onReady(null);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        onClick={() => inputRef.current?.click()}
        className="relative aspect-[4/5] rounded-lg border-2 border-dashed border-(--color-border) hover:border-(--color-accent-dim) transition-colors flex items-center justify-center cursor-pointer overflow-hidden bg-(--color-bg-elevated)"
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Your uploaded photo" className="w-full h-full object-cover" />
        ) : (
          <div className="text-center px-4">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="mx-auto text-(--color-fg-subtle) mb-2"
            >
              <path d="M12 16V4M12 4l-4 4M12 4l4 4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-sm text-(--color-fg-muted)">
              {processing ? "Processing…" : "Upload your photo"}
            </p>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <p className="text-xs text-(--color-fg-subtle) leading-relaxed">
        Your photo is judged entirely in memory for this one comparison — it is{" "}
        <strong className="text-(--color-fg-muted)">never saved to disk or a database</strong>,
        and is discarded the moment your result comes back.
      </p>
    </div>
  );
}
