"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import type { PhotoDTO } from "@/types";

export default function PhotoPicker({
  photos,
  selectedIds,
  onToggle,
  maxSelect,
}: {
  photos: PhotoDTO[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  maxSelect: number;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {photos.map((photo) => {
        const selected = selectedIds.includes(photo.id);
        const order = selectedIds.indexOf(photo.id);
        const disabled = !selected && selectedIds.length >= maxSelect;

        return (
          <motion.button
            key={photo.id}
            type="button"
            onClick={() => onToggle(photo.id)}
            disabled={disabled}
            whileTap={{ scale: 0.97 }}
            className={`relative aspect-[4/5] rounded-lg overflow-hidden border-2 transition-colors ${
              selected
                ? "border-(--color-accent)"
                : "border-transparent hover:border-(--color-border)"
            } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <Image
              src={photo.storageKey}
              alt={photo.title ?? "Untitled"}
              fill
              sizes="(min-width: 768px) 22vw, 45vw"
              placeholder="blur"
              blurDataURL={photo.blurDataUrl}
              className="object-cover"
            />
            <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors" />
            {selected && (
              <span className="absolute top-2 left-2 w-6 h-6 rounded-full bg-(--color-accent) text-(--color-bg) text-xs font-bold flex items-center justify-center shadow-lg">
                {order + 1}
              </span>
            )}
            {photo.title && (
              <span className="absolute bottom-0 inset-x-0 px-2 py-1.5 text-xs text-white/90 bg-gradient-to-t from-black/70 to-transparent truncate">
                {photo.title}
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
