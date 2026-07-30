"use client";

import { useCallback, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import type { PhotoDTO } from "@/types";
import LikeButton from "./LikeButton";
import CommentSection from "./CommentSection";

export default function Lightbox({
  photos,
  index,
  onClose,
  onNavigate,
}: {
  photos: PhotoDTO[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}) {
  const photo = photos[index];

  const goPrev = useCallback(() => {
    onNavigate((index - 1 + photos.length) % photos.length);
  }, [index, photos.length, onNavigate]);

  const goNext = useCallback(() => {
    onNavigate((index + 1) % photos.length);
  }, [index, photos.length, onNavigate]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose, goPrev, goNext]);

  if (!photo) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 md:p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={photo.title ?? "Photo"}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-5 right-5 z-20 w-11 h-11 rounded-full border border-white/15 bg-black/40 flex items-center justify-center text-white/80 hover:text-white hover:border-white/40 transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
        </svg>
      </button>

      {photos.length > 1 && (
        <>
          <NavButton direction="prev" onClick={goPrev} />
          <NavButton direction="next" onClick={goNext} />
        </>
      )}

      <div
        className="flex flex-col md:flex-row gap-8 max-w-6xl w-full max-h-[90vh] items-center md:items-stretch"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 flex items-center justify-center min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={photo.id}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="relative overflow-hidden rounded-lg shadow-2xl shadow-black/60"
            >
              <motion.div
                animate={{ scale: [1, 1.045, 1] }}
                transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
              >
                <Image
                  src={photo.storageKey}
                  alt={photo.title ?? "Untitled photograph"}
                  width={photo.width}
                  height={photo.height}
                  placeholder="blur"
                  blurDataURL={photo.blurDataUrl}
                  sizes="(min-width: 768px) 65vw, 92vw"
                  priority
                  className="max-h-[64vh] md:max-h-[78vh] max-w-[90vw] md:max-w-[62vw] w-auto h-auto object-contain block"
                />
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="w-full md:w-80 shrink-0 flex flex-col gap-6 bg-(--color-bg-elevated)/70 backdrop-blur border border-(--color-border) rounded-xl p-5 md:max-h-[78vh] overflow-y-auto">
          <div>
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-display italic text-2xl text-(--color-fg) text-balance">
                {photo.title ?? "Untitled"}
              </h2>
              {photo.isNew && (
                <span className="shrink-0 mt-1 px-2 py-0.5 text-[10px] tracking-widest uppercase rounded-full bg-(--color-accent)/15 text-(--color-accent-bright) border border-(--color-accent-dim)">
                  New
                </span>
              )}
            </div>
            {photo.description && (
              <p className="mt-2 text-sm text-(--color-fg-muted) leading-relaxed">
                {photo.description}
              </p>
            )}
          </div>

          <LikeButton key={photo.id} photoId={photo.id} initialLikeCount={photo.likeCount} />

          <div className="h-px bg-(--color-border)" />

          <CommentSection key={photo.id} photoId={photo.id} />
        </div>
      </div>
    </motion.div>
  );
}

function NavButton({ direction, onClick }: { direction: "prev" | "next"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={direction === "prev" ? "Previous photo" : "Next photo"}
      className={`absolute top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full border border-white/15 bg-black/40 flex items-center justify-center text-white/80 hover:text-white hover:border-white/40 transition-colors ${
        direction === "prev" ? "left-3 md:left-6" : "right-3 md:right-6"
      }`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        {direction === "prev" ? (
          <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
    </button>
  );
}
