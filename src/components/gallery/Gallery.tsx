"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PhotoDTO } from "@/types";
import PhotoCard from "./PhotoCard";
import Lightbox from "./Lightbox";

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

export default function Gallery({
  photos,
  revealed,
}: {
  photos: PhotoDTO[];
  revealed: boolean;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (photos.length === 0) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-center px-6">
        <div>
          <p className="font-display italic text-2xl text-(--color-fg-muted)">
            The gallery is empty — for now.
          </p>
          <p className="text-sm text-(--color-fg-subtle) mt-2">
            Check back soon, or head to /admin to upload the first frame.
          </p>
        </div>
      </div>
    );
  }

  return (
    <section id="gallery" className="px-4 md:px-8 pb-24">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate={revealed ? "visible" : "hidden"}
        className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 md:gap-6"
      >
        {photos.map((photo, i) => (
          <PhotoCard key={photo.id} photo={photo} onOpen={() => setActiveIndex(i)} />
        ))}
      </motion.div>

      <AnimatePresence>
        {activeIndex !== null && (
          <Lightbox
            photos={photos}
            index={activeIndex}
            onClose={() => setActiveIndex(null)}
            onNavigate={setActiveIndex}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
