import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRequestCookie } from "@/lib/auth";
import { storage } from "@/lib/storage";

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
