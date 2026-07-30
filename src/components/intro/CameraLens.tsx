"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import gsap from "gsap";

const BLADE_COUNT = 8;
const CENTER = 100;
const OUTER_R = 92;
const INNER_R = 10;

function bladePath(index: number): string {
  const slice = (Math.PI * 2) / BLADE_COUNT;
  const angle = index * slice;
  const half = slice * 0.62;

  const tipX = CENTER + Math.cos(angle) * INNER_R;
  const tipY = CENTER + Math.sin(angle) * INNER_R;
  const outerAX = CENTER + Math.cos(angle - half) * OUTER_R;
  const outerAY = CENTER + Math.sin(angle - half) * OUTER_R;
  const outerBX = CENTER + Math.cos(angle + half) * OUTER_R;
  const outerBY = CENTER + Math.sin(angle + half) * OUTER_R;

  return `M ${tipX} ${tipY} L ${outerAX} ${outerAY} A ${OUTER_R} ${OUTER_R} 0 0 1 ${outerBX} ${outerBY} Z`;
}

export interface CameraLensHandle {
  /** Snaps the aperture blades shut over the frame — the "shutter falls" beat. */
  play: () => Promise<void>;
}

const CameraLens = forwardRef<CameraLensHandle, { className?: string }>(
  function CameraLens({ className = "" }, ref) {
    const svgRef = useRef<SVGSVGElement>(null);
    const bladeRefs = useRef<SVGPathElement[]>([]);
    const ringRef = useRef<SVGCircleElement>(null);

    useEffect(() => {
      gsap.set(svgRef.current, { opacity: 0, scale: 0.92, transformOrigin: "50% 50%" });
      gsap.set(bladeRefs.current, { scale: 0.1, opacity: 0, transformOrigin: "100px 100px" });
      gsap.set(ringRef.current, { opacity: 0, scale: 0.85, transformOrigin: "50% 50%" });
    }, []);

    useImperativeHandle(ref, () => ({
      play: () =>
        new Promise<void>((resolve) => {
          const tl = gsap.timeline({ onComplete: resolve });
          tl.to(svgRef.current, { opacity: 1, scale: 1, duration: 0.1, ease: "power1.out" })
            .to(ringRef.current, { opacity: 0.9, scale: 1, duration: 0.14, ease: "power1.out" }, "<")
            .to(
              bladeRefs.current,
              {
                scale: 1,
                opacity: 1,
                duration: 0.3,
                ease: "power3.in",
                stagger: { each: 0.018, from: "start" },
              },
              "-=0.02",
            );
        }),
    }));

    return (
      <svg ref={svgRef} viewBox="0 0 200 200" className={className} aria-hidden="true">
        <circle
          ref={ringRef}
          cx="100"
          cy="100"
          r="96"
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="1"
          opacity="0.5"
        />
        <circle cx="100" cy="100" r="70" fill="none" stroke="var(--color-fg)" strokeWidth="0.5" opacity="0.15" />
        {Array.from({ length: BLADE_COUNT }).map((_, i) => (
          <path
            key={i}
            ref={(el) => {
              if (el) bladeRefs.current[i] = el;
            }}
            d={bladePath(i)}
            fill="url(#blade-gradient)"
            stroke="var(--color-accent-dim)"
            strokeWidth="0.5"
          />
        ))}
        <defs>
          <radialGradient id="blade-gradient" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="var(--color-bg-elevated-2)" />
            <stop offset="100%" stopColor="#050506" />
          </radialGradient>
        </defs>
      </svg>
    );
  },
);

export default CameraLens;
