"use client";

import { useCallback, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import type { PhotoDTO } from "@/types";

const POLL_INTERVAL_MS = 1500;
const POLL_MAX_ATTEMPTS = 12; // ~18s — sharp processing + DB write is normally well under this

export default function UploadForm({
  onUploaded,
  blobEnabled,
}: {
  onUploaded: (photo: PhotoDTO) => void;
  blobEnabled: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pickFile = useCallback((f: File | null) => {
    setSuccess(false);
    setError(null);
    setFile(f);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return f ? URL.createObjectURL(f) : null;
    });
  }, []);

  // The client-upload flow creates the Photo row asynchronously (Vercel Blob
  // calls our server back once the browser -> Blob transfer completes), so
  // there's nothing to synchronously return here — poll the public photos
  // list for the row this upload produced, keyed by its original Blob URL.
  async function waitForPhoto(originalUrl: string): Promise<PhotoDTO> {
    for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
      const res = await fetch("/api/photos", { cache: "no-store" });
      const data = await res.json();
      const match = (data.photos as PhotoDTO[] | undefined)?.find(
        (p) => p.originalKey === originalUrl,
      );
      if (match) return match;
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
    throw new Error(
      "Upload finished but processing is taking longer than expected — refresh in a moment to check.",
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || uploading) return;
    setUploading(true);
    setProcessing(false);
    setError(null);

    try {
      if (blobEnabled) {
        // Browser -> Blob directly, bypassing Vercel's 4.5MB function body cap.
        const blob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/admin/upload-blob",
          clientPayload: JSON.stringify({
            title: title.trim() || undefined,
            description: description.trim() || undefined,
          }),
        });
        setUploading(false);
        setProcessing(true);
        const photo = await waitForPhoto(blob.url);
        onUploaded(photo);
      } else {
        const formData = new FormData();
        formData.append("file", file);
        if (title.trim()) formData.append("title", title.trim());
        if (description.trim()) formData.append("description", description.trim());

        const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Upload failed.");
        onUploaded(data.photo);
      }

      setSuccess(true);
      setTitle("");
      setDescription("");
      pickFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setUploading(false);
      setProcessing(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5 border border-(--color-border) rounded-2xl bg-(--color-bg-elevated)/50 p-6"
    >
      <h2 className="font-display italic text-xl text-(--color-fg)">Upload a photo</h2>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const dropped = e.dataTransfer.files?.[0];
          if (dropped) pickFile(dropped);
        }}
        onClick={() => inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
          dragging
            ? "border-(--color-accent) bg-(--color-accent)/5"
            : "border-(--color-border) hover:border-(--color-accent-dim)"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />

        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Selected preview"
            className="max-h-56 rounded-lg object-contain"
          />
        ) : (
          <>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-(--color-fg-subtle)">
              <path d="M12 16V4M12 4l-4 4M12 4l4 4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-sm text-(--color-fg-muted)">
              Drag & drop a photo here, or click to browse
            </p>
            <p className="text-xs text-(--color-fg-subtle)">JPG, PNG, or WebP — up to 25MB</p>
          </>
        )}
      </div>

      <input
        type="text"
        placeholder="Title (optional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={200}
        className="w-full bg-(--color-bg-elevated-2) border border-(--color-border) rounded-lg px-3.5 py-2.5 text-sm text-(--color-fg) placeholder:text-(--color-fg-subtle) focus:outline-none focus:border-(--color-accent-dim) transition-colors"
      />
      <textarea
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={2000}
        rows={3}
        className="w-full resize-none bg-(--color-bg-elevated-2) border border-(--color-border) rounded-lg px-3.5 py-2.5 text-sm text-(--color-fg) placeholder:text-(--color-fg-subtle) focus:outline-none focus:border-(--color-accent-dim) transition-colors"
      />

      <div className="flex items-center justify-between gap-3">
        <div className="text-sm">
          {error && <span className="text-red-400">{error}</span>}
          {success && <span className="text-(--color-accent-bright)">Uploaded — now live in the gallery.</span>}
        </div>
        <button
          type="submit"
          disabled={!file || uploading || processing}
          className="shrink-0 px-5 py-2.5 rounded-full bg-(--color-accent) text-(--color-bg) font-medium text-sm hover:bg-(--color-accent-bright) transition-colors disabled:opacity-50"
        >
          {uploading ? "Uploading…" : processing ? "Processing…" : "Publish"}
        </button>
      </div>
    </form>
  );
}
