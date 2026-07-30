"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getLikedPhotoIds, getOrCreateClientId, markPhotoLiked } from "@/lib/clientId";

const BURST_PARTICLES = 8;

// NOTE: render with `key={photoId}` from the parent so this remounts (and
// re-reads localStorage) whenever the displayed photo changes, e.g. when
// navigating between photos inside the lightbox.
export default function LikeButton({
  photoId,
  initialLikeCount,
}: {
  photoId: string;
  initialLikeCount: number;
}) {
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [liked, setLiked] = useState(() => getLikedPhotoIds().has(photoId));
  const [pending, setPending] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const particles = useMemo(
    () =>
      Array.from({ length: BURST_PARTICLES }).map((_, i) => {
        const angle = (i / BURST_PARTICLES) * Math.PI * 2;
        return { x: Math.cos(angle) * 28, y: Math.sin(angle) * 28 };
      }),
    [],
  );

  async function handleClick() {
    if (liked || pending) return;
    setPending(true);
    setError(null);
    setLiked(true);
    setLikeCount((c) => c + 1);
    setBurstKey((k) => k + 1);
    markPhotoLiked(photoId);

    try {
      const res = await fetch(`/api/photos/${photoId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: getOrCreateClientId() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Couldn't like this photo.");
      }
      setLikeCount(data.likeCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      // Keep the optimistic liked state — it's a soft failure, not worth reverting the UI.
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={liked}
        aria-pressed={liked}
        aria-label={liked ? "Liked" : "Like this photo"}
        className="relative flex items-center justify-center w-11 h-11 rounded-full border border-(--color-border) bg-(--color-bg-elevated)/60 hover:border-(--color-accent-dim) transition-colors disabled:cursor-default"
      >
        <motion.svg
          key={liked ? "filled" : "outline"}
          viewBox="0 0 24 24"
          className="w-5 h-5"
          initial={{ scale: liked ? 0.6 : 1 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 12 }}
          fill={liked ? "var(--color-accent)" : "none"}
          stroke={liked ? "var(--color-accent)" : "currentColor"}
          strokeWidth="1.6"
        >
          <path d="M12 20.5s-7.5-4.6-10-9.2C0.3 8 1.6 4.5 5 3.6c2.2-.6 4.2.4 5.4 2.1C11.6 4 13.6 3 15.8 3.6c3.4.9 4.7 4.4 3 7.7-2.5 4.6-10 9.2-10 9.2Z" />
        </motion.svg>

        <AnimatePresence>
          {burstKey > 0 && (
            <motion.span
              key={burstKey}
              className="absolute inset-0 pointer-events-none"
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              {particles.map((p, i) => (
                <motion.span
                  key={i}
                  className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full bg-(--color-accent)"
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.3 }}
                  transition={{ duration: 0.55, ease: "easeOut" }}
                />
              ))}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <span className="text-sm text-(--color-fg-muted) tabular-nums min-w-[2ch]">
        {likeCount}
      </span>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
