"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { CommentDTO, PhotoDTO } from "@/types";
import { formatRelativeTime } from "@/lib/formatRelativeTime";

export default function PhotoManageList({
  photos,
  onDeletePhoto,
  onReorderPhotos,
}: {
  photos: PhotoDTO[];
  onDeletePhoto: (id: string) => void;
  onReorderPhotos: (photos: PhotoDTO[]) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  // Live-preview order while dragging, as ids — null means "use `photos` as-is".
  const [dragOrderIds, setDragOrderIds] = useState<string[] | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());

  const photoMap = useMemo(() => new Map(photos.map((p) => [p.id, p])), [photos]);
  const items = dragOrderIds
    ? dragOrderIds.map((id) => photoMap.get(id)).filter((p): p is PhotoDTO => !!p)
    : photos;

  async function persistOrder(ordered: PhotoDTO[]) {
    onReorderPhotos(ordered);
    setSavingOrder(true);
    try {
      const res = await fetch("/api/admin/photos/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: ordered.map((p) => p.id) }),
      });
      if (!res.ok) throw new Error();
    } catch {
      window.alert("Couldn't save the new order — please try again.");
    } finally {
      setSavingOrder(false);
    }
  }

  function handleDragOver(e: React.DragEvent, overId: string) {
    e.preventDefault();
    if (!dragId || dragId === overId) return;

    setDragOrderIds((prev) => {
      const list = prev ?? photos.map((p) => p.id);
      const from = list.indexOf(dragId);
      const to = list.indexOf(overId);
      if (from === -1 || to === -1) return prev;
      const next = [...list];
      next.splice(from, 1);
      next.splice(to, 0, dragId);
      return next;
    });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragId(null);
    if (dragOrderIds) {
      const ordered = dragOrderIds
        .map((id) => photoMap.get(id))
        .filter((p): p is PhotoDTO => !!p);
      void persistOrder(ordered);
    }
    setDragOrderIds(null);
  }

  async function handleDeletePhoto(id: string) {
    if (!window.confirm("Delete this photo permanently? This can't be undone.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/photos/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Delete failed.");
      }
      onDeletePhoto(id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setDeletingId(null);
    }
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-(--color-fg-subtle)">No photos yet — upload the first one above.</p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-(--color-fg-subtle) -mb-1">
        Drag the handle to reorder — the gallery reflects this order.
        {savingOrder && " Saving…"}
      </p>
      {items.map((photo) => (
        <div
          key={photo.id}
          ref={(el) => {
            if (el) rowRefs.current.set(photo.id, el);
            else rowRefs.current.delete(photo.id);
          }}
          onDragOver={(e) => handleDragOver(e, photo.id)}
          onDrop={handleDrop}
          className={`border rounded-xl bg-(--color-bg-elevated)/40 overflow-hidden transition-colors ${
            dragId === photo.id
              ? "border-(--color-accent) opacity-60"
              : "border-(--color-border)"
          }`}
        >
          <div className="flex items-center gap-3 p-3">
            <div
              draggable
              onDragStart={(e) => {
                setDragId(photo.id);
                e.dataTransfer.effectAllowed = "move";
                const el = rowRefs.current.get(photo.id);
                if (el) e.dataTransfer.setDragImage(el, 24, 24);
              }}
              onDragEnd={() => {
                setDragId(null);
                setDragOrderIds(null);
              }}
              role="button"
              aria-label="Drag to reorder"
              title="Drag to reorder"
              className="shrink-0 flex flex-col gap-[3px] p-2 -m-2 cursor-grab active:cursor-grabbing text-(--color-fg-subtle) hover:text-(--color-fg) transition-colors touch-none"
            >
              <span className="w-4 h-0.5 rounded-full bg-current" />
              <span className="w-4 h-0.5 rounded-full bg-current" />
              <span className="w-4 h-0.5 rounded-full bg-current" />
            </div>

            <div className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-(--color-bg-elevated-2)">
              <Image
                src={photo.storageKey}
                alt={photo.title ?? "Untitled"}
                fill
                sizes="80px"
                className="object-cover"
              />
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-medium text-(--color-fg) truncate">
                {photo.title ?? "Untitled"}
                {photo.isNew && (
                  <span className="ml-2 px-1.5 py-0.5 text-[10px] tracking-widest uppercase rounded-full bg-(--color-accent)/15 text-(--color-accent-bright) border border-(--color-accent-dim)">
                    New
                  </span>
                )}
              </p>
              <p className="text-xs text-(--color-fg-subtle) mt-0.5">
                {formatRelativeTime(photo.createdAt)} · {photo.likeCount} likes ·{" "}
                {photo.commentCount} comments
              </p>
            </div>

            <button
              type="button"
              onClick={() => setExpandedId((cur) => (cur === photo.id ? null : photo.id))}
              className="shrink-0 px-3 py-1.5 text-xs rounded-full border border-(--color-border) text-(--color-fg-muted) hover:text-(--color-fg) hover:border-(--color-accent-dim) transition-colors"
            >
              {expandedId === photo.id ? "Hide comments" : "Comments"}
            </button>

            <button
              type="button"
              onClick={() => handleDeletePhoto(photo.id)}
              disabled={deletingId === photo.id}
              className="shrink-0 px-3 py-1.5 text-xs rounded-full border border-red-900/50 text-red-400 hover:bg-red-950/40 transition-colors disabled:opacity-50"
            >
              {deletingId === photo.id ? "Deleting…" : "Delete"}
            </button>
          </div>

          {expandedId === photo.id && <AdminCommentPanel photoId={photo.id} />}
        </div>
      ))}
    </div>
  );
}

function AdminCommentPanel({ photoId }: { photoId: string }) {
  const [comments, setComments] = useState<CommentDTO[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/photos/${photoId}/comments`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setComments(data.comments ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [photoId]);

  async function handleDeleteComment(id: string) {
    setComments((prev) => prev?.filter((c) => c.id !== id) ?? null);
    const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
    if (!res.ok) {
      window.alert("Couldn't delete that comment.");
    }
  }

  return (
    <div className="border-t border-(--color-border) p-4 flex flex-col gap-3 bg-black/20">
      {loading && <p className="text-sm text-(--color-fg-subtle)">Loading comments…</p>}
      {!loading && comments && comments.length === 0 && (
        <p className="text-sm text-(--color-fg-subtle)">No comments on this photo yet.</p>
      )}
      {comments?.map((comment) => (
        <div key={comment.id} className="flex items-start justify-between gap-3 text-sm">
          <div className="min-w-0">
            <span className="font-medium text-(--color-fg)">{comment.name}</span>{" "}
            <span className="text-(--color-fg-subtle) text-xs">
              {formatRelativeTime(comment.createdAt)}
            </span>
            <p className="text-(--color-fg-muted) break-words">{comment.text}</p>
          </div>
          <button
            type="button"
            onClick={() => handleDeleteComment(comment.id)}
            className="shrink-0 text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
