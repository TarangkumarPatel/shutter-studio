"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import ApertureMark from "@/components/icons/ApertureMark";

const NAV_LINKS = [
  { href: "/", label: "Gallery" },
  { href: "/game", label: "Face-Off" },
  { href: "/contact", label: "Contact" },
];

export default function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
      className={`fixed top-0 inset-x-0 z-40 transition-colors duration-500 ${
        scrolled
          ? "bg-(--color-bg)/80 backdrop-blur-md border-b border-(--color-border)"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-6 md:px-10 h-18 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2.5 group"
          aria-label="Shutter Studio — home"
        >
          <ApertureMark className="w-7 h-7 text-(--color-accent) transition-transform duration-700 group-hover:rotate-45" />
          <span className="font-display italic text-lg md:text-xl tracking-wide text-(--color-fg)">
            Shutter&nbsp;Studio
          </span>
        </Link>

        <nav className="flex items-center gap-1 md:gap-2">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-3.5 py-2 text-sm tracking-wide uppercase transition-colors ${
                  active
                    ? "text-(--color-accent-bright)"
                    : "text-(--color-fg-muted) hover:text-(--color-fg)"
                }`}
              >
                {link.label}
                {active && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute left-3.5 right-3.5 -bottom-0.5 h-px bg-(--color-accent)"
                  />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </motion.header>
  );
}
