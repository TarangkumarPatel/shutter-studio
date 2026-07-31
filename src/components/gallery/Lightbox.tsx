"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useLenis } from "lenis/react";
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
  const [commentsOpen, setCommentsOpen] = useState(false);
  const lenis = useLenis();

  // Navigating to a different photo should close any open drawer rather than
  // carry it over — adjusted during render (React's sanctioned pattern for
  // this) instead of an effect, since Lightbox itself doesn't remount when
  // `photo` changes.
  const [lastPhotoId, setLastPhotoId] = useState(photo?.id);
  if (photo?.id !== lastPhotoId) {
    setLastPhotoId(photo?.id);
    setCommentsOpen(false);
  }

  const goPrev = useCallback(() => {
    onNavigate((index - 1 + photos.length) % photos.length);
  }, [index, photos.length, onNavigate]);

  const goNext = useCallback(() => {
    onNavigate((index + 1) % photos.length);
  }, [index, photos.length, onNavigate]);

  // Closing the comments drawer first (rather than the whole lightbox) on
  // Escape matches how the drawer's own visual layering reads — you're
  // backing out of the thing on top before the thing under it.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (commentsOpen) setCommentsOpen(false);
        else onClose();
      }
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, goPrev, goNext, commentsOpen]);

  // `body.style.overflow` alone doesn't stop Lenis — it drives scroll
  // independently of the native overflow property, so without this the
  // gallery visibly kept scrolling in the background while the modal (or its
  // comments drawer) was open.
  useEffect(() => {
    document.body.style.overflow = "hidden";
    lenis?.stop();
    return () => {
      document.body.style.overflow = "";
      lenis?.start();
    };
  }, [lenis]);

  if (!photo) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-2 md:p-6"
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
        className="absolute top-4 right-4 md:top-5 md:right-5 z-30 w-11 h-11 rounded-full border border-white/15 bg-black/40 flex items-center justify-center text-white/80 hover:text-white hover:border-white/40 transition-colors"
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
        className="relative flex items-center justify-center max-w-[96vw] max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
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
                sizes="96vw"
                priority
                className="max-h-[88vh] md:max-h-[92vh] max-w-[96vw] w-auto h-auto object-contain block"
              />
            </motion.div>

            {/* Caption overlay, Instagram-style — sits on the photo instead
                of pushing it into a smaller box beside a permanent panel. */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-lg bg-gradient-to-t from-black/85 via-black/25 to-transparent pt-16 pb-3 px-4 md:px-5">
              <div className="pointer-events-auto flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-display italic text-lg md:text-xl text-white text-balance truncate">
                      {photo.title ?? "Untitled"}
                    </h2>
                    {photo.isNew && (
                      <span className="shrink-0 px-2 py-0.5 text-[10px] tracking-widest uppercase rounded-full bg-(--color-accent) text-(--color-bg) font-semibold">
                        New
                      </span>
                    )}
                  </div>
                  {photo.description && (
                    <p className="mt-0.5 text-xs md:text-sm text-white/70 line-clamp-2">
                      {photo.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <LikeButton key={photo.id} photoId={photo.id} initialLikeCount={photo.likeCount} />
                  <button
                    type="button"
                    onClick={() => setCommentsOpen(true)}
                    aria-label="Open comments"
                    className="flex items-center gap-1.5 h-11 px-3.5 rounded-full border border-white/15 bg-black/40 text-white/80 hover:text-white hover:border-white/40 transition-colors"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-sm tabular-nums">{photo.commentCount}</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {commentsOpen && (
          <motion.div
            key="comments-drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-0 right-0 z-40 h-full w-full sm:w-96 max-w-full bg-(--color-bg-elevated)/95 backdrop-blur border-l border-(--color-border) flex flex-col"
            onClick={(e) => e.stopPropagation()}
            data-lenis-prevent
          >
            <div className="flex items-center justify-between gap-3 p-5 border-b border-(--color-border) shrink-0">
              <h3 className="font-display italic text-lg text-(--color-fg)">
                {photo.title ?? "Untitled"}
              </h3>
              <button
                type="button"
                onClick={() => setCommentsOpen(false)}
                aria-label="Close comments"
                className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-(--color-fg-muted) hover:text-(--color-fg) transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <CommentSection key={photo.id} photoId={photo.id} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
