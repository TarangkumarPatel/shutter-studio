"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MessageDTO, PhotoDTO } from "@/types";
import UploadForm from "./UploadForm";
import PhotoManageList from "./PhotoManageList";
import MessageManageList from "./MessageManageList";

type Tab = "photos" | "messages";

export default function AdminDashboard({
  initialPhotos,
  initialMessages,
}: {
  initialPhotos: PhotoDTO[];
  initialMessages: MessageDTO[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("photos");
  const [photos, setPhotos] = useState(initialPhotos);
  const [messages, setMessages] = useState(initialMessages);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
  }

  const totalLikes = photos.reduce((sum, p) => sum + p.likeCount, 0);
  const totalComments = photos.reduce((sum, p) => sum + p.commentCount, 0);

  return (
    <div className="max-w-4xl mx-auto px-6 pt-32 pb-24 flex flex-col gap-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display italic text-3xl text-(--color-fg)">Admin</h1>
          <p className="text-sm text-(--color-fg-subtle) mt-1">
            {photos.length} photos · {totalLikes} likes · {totalComments} comments ·{" "}
            {messages.length} messages
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="px-4 py-2 text-xs tracking-[0.15em] uppercase rounded-full border border-(--color-border) text-(--color-fg-muted) hover:text-(--color-fg) hover:border-(--color-accent-dim) transition-colors disabled:opacity-50"
        >
          {loggingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>

      <div className="flex items-center gap-2 border-b border-(--color-border)">
        <TabButton active={tab === "photos"} onClick={() => setTab("photos")}>
          Photos
        </TabButton>
        <TabButton active={tab === "messages"} onClick={() => setTab("messages")}>
          Messages
          {messages.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 text-[10px] rounded-full bg-(--color-accent)/15 text-(--color-accent-bright) border border-(--color-accent-dim)">
              {messages.length}
            </span>
          )}
        </TabButton>
      </div>

      {tab === "photos" ? (
        <>
          <UploadForm onUploaded={(photo) => setPhotos((prev) => [photo, ...prev])} />

          <div className="flex flex-col gap-4">
            <h2 className="font-display italic text-xl text-(--color-fg)">Manage photos</h2>
            <PhotoManageList
              photos={photos}
              onDeletePhoto={(id) => setPhotos((prev) => prev.filter((p) => p.id !== id))}
              onReorderPhotos={setPhotos}
            />
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-4">
          <h2 className="font-display italic text-xl text-(--color-fg)">Contact messages</h2>
          <MessageManageList
            messages={messages}
            onDeleteMessage={(id) => setMessages((prev) => prev.filter((m) => m.id !== id))}
          />
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative px-4 py-2.5 text-sm tracking-wide uppercase transition-colors flex items-center ${
        active ? "text-(--color-accent-bright)" : "text-(--color-fg-muted) hover:text-(--color-fg)"
      }`}
    >
      {children}
      {active && (
        <span className="absolute left-0 right-0 -bottom-px h-px bg-(--color-accent)" />
      )}
    </button>
  );
}
