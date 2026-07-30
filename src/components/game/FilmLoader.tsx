"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const MESSAGES = [
  "Loading the film…",
  "Metering the light…",
  "Judging composition…",
  "Weighing emotion against technique…",
  "Developing in the darkroom…",
  "Fixing the print…",
];

export default function FilmLoader() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % MESSAGES.length);
    }, 1400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-8 py-24 text-center">
      <div className="relative w-24 h-24">
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-(--color-border)"
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-0 rounded-full border-t-2 border-(--color-accent)"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-3 rounded-full bg-(--color-bg-elevated) border border-(--color-border) flex items-center justify-center"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5">
            <rect x="3" y="7" width="18" height="13" rx="2" />
            <circle cx="12" cy="13.5" r="3.5" />
            <path d="M8 7l1.5-2.5h5L16 7" />
          </svg>
        </motion.div>
      </div>

      <motion.p
        key={messageIndex}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="font-display italic text-lg text-(--color-fg-muted)"
      >
        {MESSAGES[messageIndex]}
      </motion.p>
    </div>
  );
}
