"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Quiet, low-contrast entry point to /admin — deliberately not part of the main nav. */
export default function AdminAccess() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;

  return (
    <Link
      href="/admin"
      aria-label="Admin login"
      title="Admin"
      className="fixed bottom-5 right-5 z-30 flex items-center justify-center w-9 h-9 rounded-full text-(--color-fg-subtle) opacity-30 hover:opacity-90 hover:text-(--color-accent) transition-opacity duration-300"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
        <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" strokeLinecap="round" />
      </svg>
    </Link>
  );
}
