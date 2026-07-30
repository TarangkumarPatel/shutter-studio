"use client";

import { useCallback, useLayoutEffect, useState } from "react";
import Gallery from "@/components/gallery/Gallery";
import Hero from "./Hero";
import type { PhotoDTO } from "@/types";

const INTRO_SESSION_KEY = "pp_intro_seen";

// The intro is fairly heavy (GSAP timeline + framer-motion orchestration) and
// only ever needed once per session, so it's loaded on demand rather than in
// the initial bundle.
import dynamic from "next/dynamic";
const IntroSequence = dynamic(() => import("@/components/intro/IntroSequence"), {
  ssr: false,
});

export default function HomeClient({ photos }: { photos: PhotoDTO[] }) {
  // null = "haven't decided yet" (avoids a flash of the wrong state)
  const [introDone, setIntroDone] = useState<boolean | null>(null);

  useLayoutEffect(() => {
    // One-time hydration-safe read of browser storage (no prop drives this,
    // and it must run before paint to avoid a flash of the wrong state) —
    // not the "derive state from props" case react-hooks/set-state-in-effect
    // is guarding against.
    try {
      const seen = window.sessionStorage.getItem(INTRO_SESSION_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIntroDone(Boolean(seen));
    } catch {
      setIntroDone(true);
    }
  }, []);

  const handleIntroComplete = useCallback(() => {
    try {
      window.sessionStorage.setItem(INTRO_SESSION_KEY, "1");
    } catch {
      // ignore (private browsing / storage disabled)
    }
    setIntroDone(true);
  }, []);

  return (
    <>
      {introDone === false && <IntroSequence onComplete={handleIntroComplete} />}
      <Hero />
      <Gallery photos={photos} revealed={introDone === true} />
    </>
  );
}
