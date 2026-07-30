// Rounding to a fixed precision matters here, not just for tidy SVG output:
// Math.cos/Math.sin can differ in their last couple of floating-point digits
// between Node's V8 (SSR) and the browser's V8 (hydration), which otherwise
// produces a server/client `d` attribute mismatch and a hydration error.
function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export default function ApertureMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
      {Array.from({ length: 6 }).map((_, i) => {
        const angle = (i * 60 * Math.PI) / 180;
        const cx = round(50 + Math.cos(angle) * 16);
        const cy = round(50 + Math.sin(angle) * 16);
        const outerAx = round(50 + Math.cos(angle) * 42);
        const outerAy = round(50 + Math.sin(angle) * 42);
        const outerBx = round(50 + Math.cos(angle + 1.05) * 42);
        const outerBy = round(50 + Math.sin(angle + 1.05) * 42);
        return (
          <path
            key={i}
            d={`M ${cx} ${cy} L ${outerAx} ${outerAy} L ${outerBx} ${outerBy} Z`}
            fill="currentColor"
            opacity="0.9"
          />
        );
      })}
      <circle cx="50" cy="50" r="14" fill="black" fillOpacity="0.55" />
    </svg>
  );
}
