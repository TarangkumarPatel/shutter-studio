import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRequestCookie } from "@/lib/auth";
import { storage } from "@/lib/storage";
import { isNewPhoto } from "@/lib/sorting";
import { toPhotoDTO } from "@/types";

/** Edits title/description and/or toggles pinned — any field can be omitted to leave it unchanged. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!verifyRequestCookie(request.headers.get("cookie"))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = body as { title?: unknown; description?: unknown; pinned?: unknown };
  const data: { title?: string | null; description?: string | null; pinned?: boolean } = {};

  if ("title" in parsed) {
    data.title =
      typeof parsed.title === "string" && parsed.title.trim()
        ? parsed.title.trim().slice(0, 200)
        : null;
  }
  if ("description" in parsed) {
    data.description =
      typeof parsed.description === "string" && parsed.description.trim()
        ? parsed.description.trim().slice(0, 2000)
        : null;
  }
  if (typeof parsed.pinned === "boolean") {
    data.pinned = parsed.pinned;
  }

  try {
    const photo = await prisma.photo.update({
      where: { id },
      data,
      include: { _count: { select: { comments: true } } },
    });
    return NextResponse.json({
      photo: toPhotoDTO({ ...photo, commentCount: photo._count.comments }, isNewPhoto(photo.createdAt)),
    });
  } catch {
    return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!verifyRequestCookie(request.headers.get("cookie"))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;

  const photo = await prisma.photo.findUnique({ where: { id } });
  if (!photo) {
    return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  }

  await prisma.photo.delete({ where: { id } });

  // Best-effort disk cleanup — DB row is already gone regardless of outcome.
  await Promise.allSettled([
    storage.delete(photo.storageKey),
    storage.delete(photo.originalKey),
  ]);

  return NextResponse.json({ ok: true });
}
