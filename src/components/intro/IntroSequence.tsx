"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import CameraLens, { type CameraLensHandle } from "./CameraLens";
import { playShutterClick, unlockAudioContext } from "@/lib/sound";

type Word = "LIGHTS" | "CAMERA" | "SHOOT" | null;

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

// Fraction-of-duration keyframes for the photo rig: fly in + rotate from off
// frame, settle, then punch-zoom into the lens. Times are fractions of
// PHOTO_DURATION so the whole rig animates as a single motion timeline.
const PHOTO_DURATION = 2.3; // seconds
const PHOTO_TIMES = [0, 0.42, 0.62, 0.85, 1];

const SCHEDULE = {
  hudOpen: 550,
  lights: 750,
  focusLockOn: 1500,
  camera: 1550,
  focusLockOff: 2200,
  shoot: 2300,
  hudClose: 2650,
  shutter: 2750,
  flash: 3100,
  developStart: 3250,
  complete: 4300,
};

export default function IntroSequence({ onComplete }: { onComplete: () => void }) {
  const [word, setWord] = useState<Word>(null);
  const [hudOpen, setHudOpen] = useState(false);
  const [focusLock, setFocusLock] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [developing, setDeveloping] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const finished = useRef(false);
  const soundOnRef = useRef(soundOn);
  const shutterRef = useRef<CameraLensHandle>(null);
  useEffect(() => {
    soundOnRef.current = soundOn;
  }, [soundOn]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    clearTimers();
    onComplete();
  };

  useEffect(() => {
    const schedule = (fn: () => void, delay: number) => {
      timers.current.push(setTimeout(fn, delay));
    };

    schedule(() => setHudOpen(true), SCHEDULE.hudOpen);
    schedule(() => setWord("LIGHTS"), SCHEDULE.lights);
    schedule(() => setFocusLock(true), SCHEDULE.focusLockOn);
    schedule(() => setWord("CAMERA"), SCHEDULE.camera);
    schedule(() => setFocusLock(false), SCHEDULE.focusLockOff);
    schedule(() => setWord("SHOOT"), SCHEDULE.shoot);
    schedule(() => setHudOpen(false), SCHEDULE.hudClose);
    schedule(() => {
      shutterRef.current?.play();
      if (soundOnRef.current) playShutterClick();
    }, SCHEDULE.shutter);
    schedule(() => setFlashOn(true), SCHEDULE.flash);
    schedule(() => setDeveloping(true), SCHEDULE.developStart);
    schedule(() => finish(), SCHEDULE.complete);

    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSound = () => {
    unlockAudioContext();
    setSoundOn((v) => !v);
  };

  return (
    <motion.div
      className="fixed inset-0 z-100 flex items-center justify-center overflow-hidden bg-(--color-bg)"
      initial={{ opacity: 1 }}
      animate={{ opacity: developing ? 0 : 1 }}
      transition={{ duration: developing ? 1.0 : 0, ease: [0.65, 0, 0.35, 1] }}
      onAnimationComplete={() => {
        if (developing) finish();
      }}
      role="dialog"
      aria-label="Intro animation"
    >
      <div className="grain-overlay z-10" />

      {/* The camera itself — flies in from off frame while rotating, settles,
          then punches in on the lens. */}
      <motion.div
        className="absolute inset-0"
        style={{ transformOrigin: "34% 46%" }}
        initial={{
          x: "42vw",
          y: "32vh",
          rotate: -26,
          scale: 0.55,
          opacity: 0,
          filter: "blur(14px)",
        }}
        animate={{
          x: ["42vw", "0vw", "0vw", "0vw", "0vw"],
          y: ["32vh", "0vh", "0vh", "0vh", "0vh"],
          rotate: [-26, 0, 0, 0, 0],
          scale: [0.55, 1, 1, 1.22, 1.16],
          opacity: [0, 1, 1, 1, 1],
          filter: ["blur(14px)", "blur(0px)", "blur(0px)", "blur(1.5px)", "blur(0px)"],
        }}
        transition={{ duration: PHOTO_DURATION, times: PHOTO_TIMES, ease: EASE_OUT }}
      >
        <Image
          src="/intro/camera.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
          style={{ objectPosition: "62% 50%" }}
        />
      </motion.div>

      {/* Vignette */}
      <div
        className="absolute inset-0 z-10"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.65) 100%)",
        }}
      />

      {/* Viewfinder HUD — the "screen" waking up */}
      <motion.div
        className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[8vh] md:h-[10vh]"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.85), transparent)" }}
        initial={{ y: "-100%" }}
        animate={{ y: hudOpen ? "0%" : "-100%" }}
        transition={{ duration: 0.45, ease: EASE_OUT }}
      />
      <motion.div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[8vh] md:h-[10vh]"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)" }}
        initial={{ y: "100%" }}
        animate={{ y: hudOpen ? "0%" : "100%" }}
        transition={{ duration: 0.45, ease: EASE_OUT }}
      />

      {/* Exposure readout, bottom-left */}
      <motion.div
        className="pointer-events-none absolute left-6 bottom-6 md:left-10 md:bottom-10 z-20 flex items-center gap-2 font-sans text-[11px] md:text-xs tracking-[0.15em] text-(--color-fg-muted)"
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: hudOpen ? 1 : 0, x: hudOpen ? 0 : -16 }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
      >
        <motion.span
          className="w-1.5 h-1.5 rounded-full bg-red-500"
          animate={{ opacity: [1, 0.25, 1] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
        />
        <span>REC · ISO 400 · ƒ/2.8 · 1/250</span>
      </motion.div>

      {/* Autofocus bracket near the lens */}
      <motion.svg
        viewBox="0 0 100 100"
        className="pointer-events-none absolute z-20 w-24 h-24 md:w-32 md:h-32"
        style={{ left: "22%", top: "36%" }}
        initial={{ opacity: 0, scale: 1.5 }}
        animate={{ opacity: focusLock ? 1 : 0, scale: focusLock ? 1 : 1.5 }}
        transition={{ duration: 0.35, ease: EASE_OUT }}
        aria-hidden="true"
      >
        {[
          "M4 20 V4 H20",
          "M80 4 H96 V20",
          "M96 80 V96 H80",
          "M20 96 H4 V80",
        ].map((d) => (
          <path key={d} d={d} fill="none" stroke="var(--color-accent)" strokeWidth="2.5" />
        ))}
      </motion.svg>

      {/* Slate words */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center px-6">
        <AnimatePresence mode="wait">
          {word && (
            <motion.h1
              key={word}
              initial={{ opacity: 0, y: 18, letterSpacing: "0.15em" }}
              animate={{ opacity: 1, y: 0, letterSpacing: "0.4em" }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.55, ease: EASE_OUT }}
              className="font-display font-black text-4xl md:text-6xl uppercase text-(--color-fg) text-center"
              style={{ letterSpacing: "0.35em", textShadow: "0 2px 24px rgba(0,0,0,0.6)" }}
            >
              {word}
            </motion.h1>
          )}
        </AnimatePresence>
      </div>

      {/* Shutter — snaps shut over the frame right before the flash */}
      <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
        <CameraLens ref={shutterRef} className="w-[130vmin] h-[130vmin]" />
      </div>

      {/* Shutter flash */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-40 bg-(--color-fg)"
        initial={{ opacity: 0 }}
        animate={{ opacity: flashOn ? 1 : 0 }}
        transition={{ duration: flashOn ? 0.06 : 0.5, ease: "easeOut" }}
      />

      <div className="absolute top-6 right-6 flex items-center gap-3 z-50">
        <button
          type="button"
          onClick={toggleSound}
          aria-pressed={soundOn}
          aria-label={soundOn ? "Mute intro sound" : "Enable intro sound"}
          className="w-10 h-10 rounded-full border border-(--color-border) bg-(--color-bg-elevated)/70 backdrop-blur flex items-center justify-center text-(--color-fg-muted) hover:text-(--color-accent) hover:border-(--color-accent-dim) transition-colors"
        >
          {soundOn ? <SoundOnIcon /> : <SoundOffIcon />}
        </button>
        <button
          type="button"
          onClick={finish}
          className="px-4 py-2 text-xs tracking-[0.2em] uppercase border border-(--color-border) rounded-full bg-(--color-bg-elevated)/70 backdrop-blur text-(--color-fg-muted) hover:text-(--color-fg) hover:border-(--color-accent-dim) transition-colors"
        >
          Skip
        </button>
      </div>
    </motion.div>
  );
}

function SoundOnIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 9v6h4l5 4V5L8 9H4Z" />
      <path d="M17 8a5 5 0 0 1 0 8" strokeLinecap="round" />
      <path d="M19.5 5.5a9 9 0 0 1 0 13" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

function SoundOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 9v6h4l5 4V5L8 9H4Z" />
      <path d="m17 9 4 6M21 9l-4 6" strokeLinecap="round" />
    </svg>
  );
}
