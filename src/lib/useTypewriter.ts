"use client";

import { useEffect, useState } from "react";

export function useTypewriter(text: string, { speed = 18, startDelay = 0 } = {}): string {
  // Reset during render when `text` changes (React's documented pattern for
  // adjusting state in response to a prop change) rather than as the first
  // line of an effect, which would trigger an extra cascading render.
  const [prevText, setPrevText] = useState(text);
  const [output, setOutput] = useState("");

  if (text !== prevText) {
    setPrevText(text);
    setOutput("");
  }

  useEffect(() => {
    let i = 0;
    let interval: ReturnType<typeof setInterval>;

    const timeout = setTimeout(() => {
      interval = setInterval(() => {
        i += 1;
        setOutput(text.slice(0, i));
        if (i >= text.length) clearInterval(interval);
      }, speed);
    }, startDelay);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [text, speed, startDelay]);

  return output;
}
