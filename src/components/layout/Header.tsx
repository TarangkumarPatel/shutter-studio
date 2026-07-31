"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ApertureMark from "@/components/icons/ApertureMark";

const NAV_LINKS = [
  { href: "/", label: "Gallery" },
  { href: "/game", label: "Face-Off" },
  { href: "/contact", label: "Contact" },
];

export default function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu whenever the route actually changes — adjusted
  // during render rather than an effect, since Header doesn't remount
  // across navigations.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMenuOpen(false);
  }

  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
      className={`fixed top-0 inset-x-0 z-40 transition-colors duration-500 ${
        scrolled || menuOpen
          ? "bg-(--color-bg)/80 backdrop-blur-md border-b border-(--color-border)"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-6 md:px-10 h-18 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2.5 group min-w-0"
          aria-label="Shutter Studio — home"
        >
          <ApertureMark className="w-7 h-7 shrink-0 text-(--color-accent) transition-transform duration-700 group-hover:rotate-45" />
          <span className="font-display italic text-base sm:text-lg md:text-xl tracking-wide text-(--color-fg) truncate">
            Shutter&nbsp;Studio
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 md:gap-2">
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

        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          className="md:hidden shrink-0 relative w-9 h-9 flex items-center justify-center text-(--color-fg-muted) hover:text-(--color-fg) transition-colors"
        >
          <span className="relative w-5 h-4 block">
            <motion.span
              className="absolute left-0 right-0 h-px bg-current"
              animate={{ top: menuOpen ? "50%" : "0%", rotate: menuOpen ? 45 : 0 }}
              transition={{ duration: 0.25 }}
              style={{ translateY: "-50%" }}
            />
            <motion.span
              className="absolute left-0 right-0 top-1/2 h-px bg-current"
              style={{ translateY: "-50%" }}
              animate={{ opacity: menuOpen ? 0 : 1 }}
              transition={{ duration: 0.15 }}
            />
            <motion.span
              className="absolute left-0 right-0 h-px bg-current"
              animate={{ top: menuOpen ? "50%" : "100%", rotate: menuOpen ? -45 : 0 }}
              transition={{ duration: 0.25 }}
              style={{ translateY: "-50%" }}
            />
          </span>
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="md:hidden overflow-hidden border-t border-(--color-border) bg-(--color-bg)/95 backdrop-blur-md"
          >
            <div className="flex flex-col px-6 py-2">
              {NAV_LINKS.map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`py-3 text-sm tracking-wide uppercase border-b border-(--color-border) last:border-0 transition-colors ${
                      active ? "text-(--color-accent-bright)" : "text-(--color-fg-muted)"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
