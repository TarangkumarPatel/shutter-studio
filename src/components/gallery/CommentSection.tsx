"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { CommentDTO } from "@/types";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import {
  getMyCommentIds,
  getOrCreateClientId,
  markCommentMine,
  unmarkCommentMine,
} from "@/lib/clientId";

// NOTE: render with `key={photoId}` from the parent so this remounts (and
// refetches) whenever the displayed photo changes, e.g. navigating inside
// the lightbox.
export default function CommentSection({ photoId }: { photoId: string }) {
  const [comments, setComments] = useState<CommentDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mine, setMine] = useState<Set<string>>(() => getMyCommentIds());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editText, setEditText] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/photos/${photoId}/comments`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setComments(data.comments ?? []);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load comments.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [photoId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (!name.trim() || !text.trim()) {
      setError("Please fill in both fields.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/photos/${photoId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, text, clientId: getOrCreateClientId() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Couldn't post your comment.");
      }
      setComments((prev) => [data.comment, ...prev]);
      markCommentMine(data.comment.id);
      setMine((prev) => new Set(prev).add(data.comment.id));
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(comment: CommentDTO) {
    setEditingId(comment.id);
    setEditName(comment.name);
    setEditText(comment.text);
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
  }

  async function handleEditSubmit(e: React.FormEvent, id: string) {
    e.preventDefault();
    if (editSubmitting) return;
    setEditError(null);

    if (!editName.trim() || !editText.trim()) {
      setEditError("Please fill in both fields.");
      return;
    }

    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/comments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: getOrCreateClientId(),
          name: editName,
          text: editText,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't update your comment.");
      setComments((prev) => prev.map((c) => (c.id === id ? data.comment : c)));
      setEditingId(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    const prevComments = comments;
    setComments((prev) => prev.filter((c) => c.id !== id));
    unmarkCommentMine(id);
    setMine((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    const res = await fetch(`/api/comments/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: getOrCreateClientId() }),
    });
    if (!res.ok) {
      // Revert — the delete didn't actually happen server-side.
      setComments(prevComments);
      markCommentMine(id);
      setMine((prev) => new Set(prev).add(id));
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <h3 className="font-display italic text-lg text-(--color-fg)">
        Comments {comments.length > 0 && <span className="text-(--color-fg-subtle) not-italic font-sans text-sm">({comments.length})</span>}
      </h3>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          className="w-full bg-(--color-bg-elevated) border border-(--color-border) rounded-lg px-3.5 py-2.5 text-sm text-(--color-fg) placeholder:text-(--color-fg-subtle) focus:outline-none focus:border-(--color-accent-dim) transition-colors"
        />
        <textarea
          placeholder="Say something about this shot…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={1000}
          rows={3}
          className="w-full resize-none bg-(--color-bg-elevated) border border-(--color-border) rounded-lg px-3.5 py-2.5 text-sm text-(--color-fg) placeholder:text-(--color-fg-subtle) focus:outline-none focus:border-(--color-accent-dim) transition-colors"
        />
        <div className="flex items-center justify-between gap-3">
          {error ? (
            <span className="text-xs text-red-400">{error}</span>
          ) : (
            <span className="text-xs text-(--color-fg-subtle)">No account needed.</span>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="shrink-0 px-4 py-2 text-xs tracking-[0.15em] uppercase rounded-full bg-(--color-accent) text-(--color-bg) hover:bg-(--color-accent-bright) transition-colors disabled:opacity-50"
          >
            {submitting ? "Posting…" : "Post"}
          </button>
        </div>
      </form>

      <div className="flex flex-col gap-4 max-h-72 overflow-y-auto pr-1">
        {loading && <p className="text-sm text-(--color-fg-subtle)">Loading comments…</p>}
        {!loading && comments.length === 0 && (
          <p className="text-sm text-(--color-fg-subtle)">Be the first to comment.</p>
        )}
        <AnimatePresence initial={false}>
          {comments.map((comment) =>
            editingId === comment.id ? (
              <motion.form
                key={comment.id}
                onSubmit={(e) => handleEditSubmit(e, comment.id)}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col gap-2 border-b border-(--color-border) pb-3 last:border-0"
              >
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={60}
                  className="w-full bg-(--color-bg-elevated) border border-(--color-border) rounded-lg px-3 py-2 text-sm text-(--color-fg) focus:outline-none focus:border-(--color-accent-dim) transition-colors"
                />
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  maxLength={1000}
                  rows={2}
                  className="w-full resize-none bg-(--color-bg-elevated) border border-(--color-border) rounded-lg px-3 py-2 text-sm text-(--color-fg) focus:outline-none focus:border-(--color-accent-dim) transition-colors"
                />
                <div className="flex items-center justify-between gap-3">
                  {editError ? (
                    <span className="text-xs text-red-400">{editError}</span>
                  ) : (
                    <span />
                  )}
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="px-3 py-1.5 text-xs tracking-[0.15em] uppercase rounded-full border border-(--color-border) text-(--color-fg-muted) hover:text-(--color-fg) transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={editSubmitting}
                      className="px-3 py-1.5 text-xs tracking-[0.15em] uppercase rounded-full bg-(--color-accent) text-(--color-bg) hover:bg-(--color-accent-bright) transition-colors disabled:opacity-50"
                    >
                      {editSubmitting ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>
              </motion.form>
            ) : (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="border-b border-(--color-border) pb-3 last:border-0"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-(--color-fg)">{comment.name}</span>
                  <span className="text-xs text-(--color-fg-subtle) shrink-0">
                    {formatRelativeTime(comment.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-(--color-fg-muted) mt-1 whitespace-pre-wrap break-words">
                  {comment.text}
                </p>
                {mine.has(comment.id) && (
                  <div className="flex gap-3 mt-1.5">
                    <button
                      type="button"
                      onClick={() => startEdit(comment)}
                      className="text-xs text-(--color-fg-subtle) hover:text-(--color-fg) transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(comment.id)}
                      className="text-xs text-red-400/80 hover:text-red-400 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </motion.div>
            ),
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
