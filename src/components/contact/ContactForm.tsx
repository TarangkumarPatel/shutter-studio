"use client";

import { useState } from "react";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't send your message.");

      setSuccess(true);
      setName("");
      setEmail("");
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-xl mx-auto flex flex-col gap-5 border border-(--color-border) rounded-2xl bg-(--color-bg-elevated)/50 p-6 md:p-8"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="contact-name" className="text-xs tracking-[0.15em] uppercase text-(--color-fg-subtle)">
          Your Name
        </label>
        <input
          id="contact-name"
          type="text"
          placeholder="Jane Doe"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          required
          className="w-full bg-(--color-bg-elevated-2) border border-(--color-border) rounded-lg px-3.5 py-2.5 text-sm text-(--color-fg) placeholder:text-(--color-fg-subtle) focus:outline-none focus:border-(--color-accent-dim) transition-colors"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="contact-email" className="text-xs tracking-[0.15em] uppercase text-(--color-fg-subtle)">
          Email Address
        </label>
        <input
          id="contact-email"
          type="email"
          placeholder="jane@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={200}
          required
          className="w-full bg-(--color-bg-elevated-2) border border-(--color-border) rounded-lg px-3.5 py-2.5 text-sm text-(--color-fg) placeholder:text-(--color-fg-subtle) focus:outline-none focus:border-(--color-accent-dim) transition-colors"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="contact-message" className="text-xs tracking-[0.15em] uppercase text-(--color-fg-subtle)">
          Message
        </label>
        <textarea
          id="contact-message"
          placeholder="Tell me about your project…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={4000}
          rows={5}
          required
          className="w-full resize-none bg-(--color-bg-elevated-2) border border-(--color-border) rounded-lg px-3.5 py-2.5 text-sm text-(--color-fg) placeholder:text-(--color-fg-subtle) focus:outline-none focus:border-(--color-accent-dim) transition-colors"
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="text-sm">
          {error && <span className="text-red-400">{error}</span>}
          {success && (
            <span className="text-(--color-accent-bright)">
              Message sent — thank you, I&rsquo;ll be in touch.
            </span>
          )}
        </div>
        <button
          type="submit"
          disabled={sending}
          className="shrink-0 px-6 py-2.5 rounded-full bg-(--color-accent) text-(--color-bg) font-medium text-sm hover:bg-(--color-accent-bright) transition-colors disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send Message"}
        </button>
      </div>
    </form>
  );
}
