"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import ApertureMark from "@/components/icons/ApertureMark";

export default function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Login failed.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 pt-24">
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-sm flex flex-col items-center gap-6 border border-(--color-border) rounded-2xl bg-(--color-bg-elevated)/60 backdrop-blur p-8"
      >
        <ApertureMark className="w-10 h-10 text-(--color-accent)" />
        <div className="text-center">
          <h1 className="font-display italic text-2xl text-(--color-fg)">Admin</h1>
          <p className="text-sm text-(--color-fg-subtle) mt-1">
            Enter the password to manage the gallery.
          </p>
        </div>

        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full bg-(--color-bg-elevated-2) border border-(--color-border) rounded-lg px-4 py-3 text-center text-(--color-fg) placeholder:text-(--color-fg-subtle) focus:outline-none focus:border-(--color-accent-dim) transition-colors"
        />

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !password}
          className="w-full py-3 rounded-lg bg-(--color-accent) text-(--color-bg) font-medium tracking-wide hover:bg-(--color-accent-bright) transition-colors disabled:opacity-50"
        >
          {submitting ? "Checking…" : "Enter"}
        </button>
      </motion.form>
    </div>
  );
}
