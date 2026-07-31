"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ReactLenis } from "lenis/react";

export default function SmoothScrollProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // Must start `false` to match the server-rendered output exactly (the
  // server has no `window`, so it always renders the Lenis-wrapped tree).
  // Reading matchMedia() in a lazy initializer instead would make the
  // client's first render diverge from the server's whenever the visitor
  // has reduced-motion enabled at the OS level — a real hydration mismatch,
  // not just a lint nit. The correction happens a frame later, in the
  // effect below, which is imperceptible.
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReducedMotion(query.matches);
    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);

  // /admin is a data-heavy utility page (long, dynamically-growing photo
  // list) — Lenis's momentum scroll adds no value there and was observed
  // clipping how far the page could actually scroll, so it just uses native
  // scrolling instead.
  if (reducedMotion || pathname?.startsWith("/admin")) {
    return <>{children}</>;
  }

  return (
    <ReactLenis
      root
      options={{ lerp: 0.1, duration: 1.2, smoothWheel: true, syncTouch: false }}
    >
      {children}
    </ReactLenis>
  );
}
