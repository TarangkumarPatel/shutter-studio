"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import ScoreCounter from "./ScoreCounter";
import { useTypewriter } from "@/lib/useTypewriter";
import type { GameJudgeResponse } from "@/types";

export interface RevealSide {
  src: string;
  label: string;
}

export default function ResultReveal({
  result,
  photoA,
  photoB,
  onPlayAgain,
}: {
  result: GameJudgeResponse;
  photoA: RevealSide;
  photoB: RevealSide;
  onPlayAgain: () => void;
}) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    const colors = ["#e3a94a", "#f5c778", "#f4f2ec"];
    const duration = 1600;
    const end = Date.now() + duration;

    (function frame() {
      confetti({ particleCount: 3, angle: 60, spread: 65, origin: { x: 0 }, colors });
      confetti({ particleCount: 3, angle: 120, spread: 65, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();

    confetti({ particleCount: 90, spread: 100, origin: { y: 0.35 }, colors, startVelocity: 45 });
  }, []);

  const verdict = useTypewriter(result.verdict, { speed: 22, startDelay: 300 });

  return (
    <div className="flex flex-col items-center gap-10">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <p className="text-xs tracking-[0.35em] uppercase text-(--color-accent) mb-3">
          The Verdict
        </p>
        <h2 className="font-display italic text-3xl md:text-4xl text-(--color-fg) max-w-2xl text-balance min-h-[2.6em]">
          {verdict}
          <span className="inline-block w-0.5 h-7 ml-1 bg-(--color-accent) animate-pulse align-middle" />
        </h2>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        <ResultCard
          side="A"
          image={photoA}
          score={result.photoA.score}
          critique={result.photoA.critique}
          isWinner={result.winner === "A"}
        />
        <ResultCard
          side="B"
          image={photoB}
          score={result.photoB.score}
          critique={result.photoB.critique}
          isWinner={result.winner === "B"}
        />
      </div>

      {result.winner === "tie" && (
        <p className="text-(--color-fg-muted) text-sm -mt-4">A dead-even tie — both frames earn the win.</p>
      )}

      <button
        type="button"
        onClick={onPlayAgain}
        className="px-6 py-3 rounded-full border border-(--color-border) text-(--color-fg-muted) hover:text-(--color-fg) hover:border-(--color-accent-dim) transition-colors text-sm tracking-wide uppercase"
      >
        Play again
      </button>
    </div>
  );
}

function ResultCard({
  side,
  image,
  score,
  critique,
  isWinner,
}: {
  side: "A" | "B";
  image: RevealSide;
  score: number;
  critique: string;
  isWinner: boolean;
}) {
  const revealedCritique = useTypewriter(critique, { speed: 12, startDelay: isWinner ? 900 : 600 });

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: side === "A" ? 0.1 : 0.2 }}
      className={`relative rounded-2xl overflow-hidden border ${
        isWinner ? "border-(--color-accent)" : "border-(--color-border)"
      }`}
    >
      {isWinner && (
        <div
          className="pointer-events-none absolute -inset-6 -z-10"
          style={{
            background:
              "radial-gradient(circle, rgba(227,169,74,0.35), transparent 65%)",
          }}
        />
      )}

      <div className="relative aspect-[4/3] bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.src} alt={image.label} className="w-full h-full object-cover" />
        {isWinner && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 300, damping: 15 }}
            className="absolute top-3 right-3 px-3 py-1 rounded-full bg-(--color-accent) text-(--color-bg) text-xs font-bold tracking-widest uppercase shadow-lg"
          >
            Winner
          </motion.div>
        )}
      </div>

      <div className="p-5 bg-(--color-bg-elevated)/80 backdrop-blur">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs tracking-widest uppercase text-(--color-fg-subtle)">
            Photo {side}
          </span>
          <span className="font-display italic text-3xl text-(--color-fg)">
            <ScoreCounter value={score} start />
            <span className="text-base text-(--color-fg-subtle)">/100</span>
          </span>
        </div>
        <p className="text-sm text-(--color-fg-muted) leading-relaxed min-h-[4.5em]">
          {revealedCritique}
        </p>
      </div>
    </motion.div>
  );
}
