"use client";

import Image from "next/image";
import { motion, type Variants } from "framer-motion";
import type { PhotoDTO } from "@/types";

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};

export default function PhotoCard({
  photo,
  onOpen,
}: {
  photo: PhotoDTO;
  onOpen: () => void;
}) {
  return (
    <motion.div variants={itemVariants} className="break-inside-avoid mb-4 md:mb-6">
      <motion.button
        type="button"
        onClick={onOpen}
        whileHover="hover"
        initial="rest"
        animate="rest"
        className="group relative block w-full overflow-hidden rounded-md bg-(--color-bg-elevated) text-left cursor-zoom-in"
      >
        <motion.div
          variants={{
            rest: { scale: 1, rotate: 0 },
            hover: { scale: 1.045, rotate: -0.35 },
          }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <Image
            src={photo.storageKey}
            alt={photo.title ?? "Untitled photograph"}
            width={photo.width}
            height={photo.height}
            placeholder="blur"
            blurDataURL={photo.blurDataUrl}
            sizes="(min-width: 1280px) 24vw, (min-width: 1024px) 32vw, (min-width: 640px) 48vw, 94vw"
            className="w-full h-auto object-cover"
          />
        </motion.div>

        <div className="absolute top-3 left-3 flex gap-1.5">
          {photo.pinned && (
            <span className="px-2 py-0.5 text-[10px] tracking-widest uppercase rounded-full bg-(--color-accent) text-(--color-bg) font-semibold shadow-lg">
              Pinned
            </span>
          )}
          {photo.isNew && (
            <span className="px-2 py-0.5 text-[10px] tracking-widest uppercase rounded-full bg-(--color-accent) text-(--color-bg) font-semibold shadow-lg">
              New
            </span>
          )}
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between gap-2">
          <span className="font-display italic text-white text-lg text-balance line-clamp-2">
            {photo.title ?? "Untitled"}
          </span>
          <span className="flex items-center gap-1 shrink-0 text-white/90 text-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 20.5s-7.5-4.6-10-9.2C0.3 8 1.6 4.5 5 3.6c2.2-.6 4.2.4 5.4 2.1C11.6 4 13.6 3 15.8 3.6c3.4.9 4.7 4.4 3 7.7-2.5 4.6-10 9.2-10 9.2Z" />
            </svg>
            {photo.likeCount}
          </span>
        </div>
      </motion.button>
    </motion.div>
  );
}
