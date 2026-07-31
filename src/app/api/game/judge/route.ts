import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { storageKeyToFilePath } from "@/lib/storage";
import { judgePhotoPair, JudgeError, type JudgeImageInput } from "@/lib/aiJudge";
import { getClientIp, hashIp } from "@/lib/ip";
import { checkRateLimit } from "@/lib/rateLimit";
import type { GameJudgeRequest } from "@/types";

const MAX_CHALLENGE_BASE64_LENGTH = 10 * 1024 * 1024; // ~7.5MB binary, generous for a single photo
const ALLOWED_CHALLENGE_MEDIA_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

async function loadPortfolioImage(photoId: string): Promise<JudgeImageInput> {
  const photo = await prisma.photo.findUnique({ where: { id: photoId } });
  if (!photo) {
    throw new JudgeError("One of the selected portfolio photos no longer exists.", "api");
  }
  const buffer = await readFile(storageKeyToFilePath(photo.storageKey));
  return {
    base64: buffer.toString("base64"),
    mediaType: "image/webp",
    label: photo.title ?? "Untitled",
  };
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const rate = checkRateLimit(`game:${hashIp(ip)}`, { limit: 10, windowMs: 5 * 60_000 });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many judging requests. Take a breather and try again shortly." },
      { status: 429 },
    );
  }

  let body: GameJudgeRequest;
  try {
    body = (await request.json()) as GameJudgeRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.photoAId || typeof body.photoAId !== "string") {
    return NextResponse.json({ error: "Missing photoAId." }, { status: 400 });
  }

  try {
    const photoA = await loadPortfolioImage(body.photoAId);
    let photoB: JudgeImageInput;

    if (body.mode === "challenge") {
      if (!body.challengeImageBase64 || !body.challengeImageMediaType) {
        return NextResponse.json(
          { error: "Missing uploaded challenger image." },
          { status: 400 },
        );
      }
      if (body.challengeImageBase64.length > MAX_CHALLENGE_BASE64_LENGTH) {
        return NextResponse.json({ error: "Uploaded image is too large." }, { status: 400 });
      }
      if (!ALLOWED_CHALLENGE_MEDIA_TYPES.has(body.challengeImageMediaType)) {
        return NextResponse.json({ error: "Unsupported image type." }, { status: 400 });
      }
      // NOTE: the challenger's upload is used entirely in-memory for this one
      // request and is never written to disk or the database.
      photoB = {
        base64: body.challengeImageBase64,
        mediaType: body.challengeImageMediaType as JudgeImageInput["mediaType"],
        label: "your photo",
      };
    } else {
      if (!body.photoBId || typeof body.photoBId !== "string") {
        return NextResponse.json({ error: "Missing photoBId." }, { status: 400 });
      }
      photoB = await loadPortfolioImage(body.photoBId);
    }

    const verdict = await judgePhotoPair(photoA, photoB);
    return NextResponse.json(verdict);
  } catch (err) {
    if (err instanceof JudgeError) {
      const status = err.kind === "config" ? 503 : err.kind === "refusal" ? 422 : 502;
      return NextResponse.json({ error: err.message }, { status });
    }
    console.error("Game judge error:", err);
    return NextResponse.json(
      { error: "Something went wrong while developing the results. Please try again." },
      { status: 500 },
    );
  }
}
