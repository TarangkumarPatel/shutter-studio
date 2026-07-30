"use client";

import { useState } from "react";
import type { MessageDTO } from "@/types";
import { formatRelativeTime } from "@/lib/formatRelativeTime";

export default function MessageManageList({
  messages,
  onDeleteMessage,
}: {
  messages: MessageDTO[];
  onDeleteMessage: (id: string) => void;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this message permanently? This can't be undone.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/messages/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Delete failed.");
      }
      onDeleteMessage(id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setDeletingId(null);
    }
  }

  if (messages.length === 0) {
    return (
      <p className="text-sm text-(--color-fg-subtle)">
        No messages yet — they&apos;ll show up here when someone uses the contact form.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className="border border-(--color-border) rounded-xl bg-(--color-bg-elevated)/40 p-4 flex flex-col gap-2"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-(--color-fg) truncate">{msg.name}</p>
              <a
                href={`mailto:${msg.email}`}
                className="text-xs text-(--color-accent) hover:text-(--color-accent-bright) transition-colors break-all"
              >
                {msg.email}
              </a>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-(--color-fg-subtle)">
                {formatRelativeTime(msg.createdAt)}
              </span>
              <button
                type="button"
                onClick={() => handleDelete(msg.id)}
                disabled={deletingId === msg.id}
                className="px-3 py-1.5 text-xs rounded-full border border-red-900/50 text-red-400 hover:bg-red-950/40 transition-colors disabled:opacity-50"
              >
                {deletingId === msg.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
          <p className="text-sm text-(--color-fg-muted) whitespace-pre-wrap break-words">
            {msg.message}
          </p>
        </div>
      ))}
    </div>
  );
}
