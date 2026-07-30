"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { PhotoDTO, GameJudgeResponse, GameMode } from "@/types";
import type { ResizedImage } from "@/lib/clientImage";
import PhotoPicker from "./PhotoPicker";
import ChallengeUpload from "./ChallengeUpload";
import FilmLoader from "./FilmLoader";
import ResultReveal from "./ResultReveal";

type Step = "mode" | "select" | "loading" | "result" | "error";

export default function GameArena({ photos }: { photos: PhotoDTO[] }) {
  const [step, setStep] = useState<Step>("mode");
  const [mode, setMode] = useState<GameMode | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [challengeImage, setChallengeImage] = useState<ResizedImage | null>(null);
  const [result, setResult] = useState<GameJudgeResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const photoById = useMemo(() => new Map(photos.map((p) => [p.id, p])), [photos]);

  function reset() {
    setStep("mode");
    setMode(null);
    setSelectedIds([]);
    setChallengeImage(null);
    setResult(null);
    setErrorMessage(null);
  }

  function chooseMode(next: GameMode) {
    setMode(next);
    setSelectedIds([]);
    setChallengeImage(null);
    setStep("select");
  }

  function toggleSelect(id: string) {
    const maxSelect = mode === "challenge" ? 1 : 2;
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= maxSelect) return prev;
      return [...prev, id];
    });
  }

  const canSubmit =
    mode === "challenge"
      ? selectedIds.length === 1 && !!challengeImage
      : selectedIds.length === 2;

  async function handleSubmit() {
    if (!mode || !canSubmit) return;
    setStep("loading");
    setErrorMessage(null);

    try {
      const body =
        mode === "challenge"
          ? {
              mode,
              photoAId: selectedIds[0],
              challengeImageBase64: challengeImage?.base64,
              challengeImageMediaType: challengeImage?.mediaType,
            }
          : { mode, photoAId: selectedIds[0], photoBId: selectedIds[1] };

      const res = await fetch("/api/game/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "The judge couldn't reach a verdict.");

      setResult(data as GameJudgeResponse);
      setStep("result");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
      setStep("error");
    }
  }

  if (photos.length < 2) {
    return (
      <div className="text-center py-24 px-6">
        <p className="font-display italic text-2xl text-(--color-fg-muted)">
          The gallery needs at least two photos before the judge can work.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 pt-32 pb-24">
      <AnimatePresence mode="wait">
        {step === "mode" && (
          <motion.div
            key="mode"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-12 text-center"
          >
            <div>
              <p className="text-xs tracking-[0.35em] uppercase text-(--color-accent) mb-4">
                AI Photo Face-Off
              </p>
              <h1 className="font-display italic text-4xl md:text-6xl text-(--color-fg) text-balance">
                Let AI judge.
              </h1>
              <p className="mt-4 max-w-lg mx-auto text-(--color-fg-muted)">
                Pick two frames and an AI photography judge scores composition,
                light, emotion, and craft — then declares a winner.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
              <ModeCard
                title="Compare and Score Photos from Portfolio"
                description="Pick any two photos from the gallery and see which one wins."
                onClick={() => chooseMode("portfolio-vs-portfolio")}
              />
              <ModeCard
                title="Challenge the Photographer"
                description="Upload your own photo and pit it against a portfolio pick."
                onClick={() => chooseMode("challenge")}
              />
            </div>
          </motion.div>
        )}

        {step === "select" && mode && (
          <motion.div
            key="select"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display italic text-2xl text-(--color-fg)">
                  {mode === "challenge" ? "Pick your opponent" : "Pick two photos"}
                </h2>
                <p className="text-sm text-(--color-fg-subtle) mt-1">
                  {mode === "challenge"
                    ? "Choose one portfolio photo, then upload yours."
                    : `${selectedIds.length}/2 selected`}
                </p>
              </div>
              <button
                type="button"
                onClick={reset}
                className="text-xs tracking-widest uppercase text-(--color-fg-subtle) hover:text-(--color-fg) transition-colors"
              >
                ← Change mode
              </button>
            </div>

            {mode === "challenge" ? (
              <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-8">
                <PhotoPicker
                  photos={photos}
                  selectedIds={selectedIds}
                  onToggle={toggleSelect}
                  maxSelect={1}
                />
                <ChallengeUpload onReady={setChallengeImage} />
              </div>
            ) : (
              <PhotoPicker
                photos={photos}
                selectedIds={selectedIds}
                onToggle={toggleSelect}
                maxSelect={2}
              />
            )}

            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="px-8 py-3.5 rounded-full bg-(--color-accent) text-(--color-bg) font-medium tracking-wide hover:bg-(--color-accent-bright) transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Judge this pair
              </button>
            </div>
          </motion.div>
        )}

        {step === "loading" && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <FilmLoader />
          </motion.div>
        )}

        {step === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-6 text-center py-24"
          >
            <p className="font-display italic text-2xl text-(--color-fg)">
              The judge stepped out.
            </p>
            <p className="text-(--color-fg-muted) max-w-md">{errorMessage}</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep("select")}
                className="px-5 py-2.5 rounded-full border border-(--color-border) text-(--color-fg-muted) hover:text-(--color-fg) transition-colors text-sm"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={reset}
                className="px-5 py-2.5 rounded-full bg-(--color-accent) text-(--color-bg) text-sm font-medium"
              >
                Start over
              </button>
            </div>
          </motion.div>
        )}

        {step === "result" && result && mode && (
          <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ResultReveal
              result={result}
              photoA={{
                src: photoById.get(selectedIds[0])?.storageKey ?? "",
                label: photoById.get(selectedIds[0])?.title ?? "Photo A",
              }}
              photoB={{
                src:
                  mode === "challenge"
                    ? (challengeImage?.previewUrl ?? "")
                    : (photoById.get(selectedIds[1])?.storageKey ?? ""),
                label:
                  mode === "challenge"
                    ? "Your photo"
                    : (photoById.get(selectedIds[1])?.title ?? "Photo B"),
              }}
              onPlayAgain={reset}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ModeCard({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      className="text-left p-6 rounded-2xl border border-(--color-border) bg-(--color-bg-elevated)/50 hover:border-(--color-accent-dim) transition-colors"
    >
      <h3 className="font-display italic text-xl text-(--color-fg) mb-2">{title}</h3>
      <p className="text-sm text-(--color-fg-muted) leading-relaxed">{description}</p>
    </motion.button>
  );
}
