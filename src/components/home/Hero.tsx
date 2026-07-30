"use client";

import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section className="relative flex flex-col items-center justify-center text-center px-6 pt-40 pb-24 md:pt-52 md:pb-32 overflow-hidden">
      <div className="grain-overlay" />
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(227,169,74,0.08), transparent 70%)",
        }}
      />

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1 }}
        className="text-xs md:text-sm tracking-[0.4em] uppercase text-(--color-accent) mb-6"
      >
        A Photography Studio
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="font-display italic text-5xl sm:text-6xl md:text-8xl leading-[1.05] text-(--color-fg) text-balance max-w-4xl"
      >
        Light, held still.
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="mt-7 max-w-xl text-(--color-fg-muted) text-base md:text-lg leading-relaxed text-balance"
      >
        A collection of frames — landscapes, portraits, and quiet moments —
        shot on instinct and printed on patience. Scroll to look closer.
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1 }}
        className="mt-16 flex flex-col items-center gap-2 text-(--color-fg-subtle)"
      >
        <span className="text-[10px] tracking-[0.3em] uppercase">Scroll</span>
        <motion.span
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="w-px h-10 bg-gradient-to-b from-(--color-accent) to-transparent"
        />
      </motion.div>
    </section>
  );
}
