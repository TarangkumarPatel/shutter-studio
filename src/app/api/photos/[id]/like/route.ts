import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIp, hashIp } from "@/lib/ip";
import { checkRateLimit } from "@/lib/rateLimit";

const IP_SOFT_LIMIT_PER_PHOTO = 5; // guards against localStorage-clearing abuse

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: photoId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const clientId = (body as { clientId?: unknown })?.clientId;
  if (typeof clientId !== "string" || clientId.length < 8 || clientId.length > 128) {
    return NextResponse.json({ error: "Missing or invalid clientId." }, { status: 400 });
  }

  const ip = getClientIp(request.headers);
  const ipHash = hashIp(ip);

  const rate = checkRateLimit(`like:${ipHash}`, { limit: 30, windowMs: 60_000 });
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests. Slow down." }, { status: 429 });
  }

  const photo = await prisma.photo.findUnique({ where: { id: photoId }, select: { id: true } });
  if (!photo) {
    return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  }

  const existing = await prisma.like.findUnique({
    where: { photoId_clientId: { photoId, clientId } },
  });
  if (existing) {
    const current = await prisma.photo.findUnique({
      where: { id: photoId },
      select: { likeCount: true },
    });
    return NextResponse.json({ alreadyLiked: true, likeCount: current?.likeCount ?? 0 });
  }

  const ipLikesOnPhoto = await prisma.like.count({ where: { photoId, ipHash } });
  if (ipLikesOnPhoto >= IP_SOFT_LIMIT_PER_PHOTO) {
    return NextResponse.json(
      { error: "This photo has already received several likes from your network." },
      { status: 429 },
    );
  }

  const [, updatedPhoto] = await prisma.$transaction([
    prisma.like.create({ data: { photoId, clientId, ipHash } }),
    prisma.photo.update({ where: { id: photoId }, data: { likeCount: { increment: 1 } } }),
  ]);

  return NextResponse.json({ alreadyLiked: false, likeCount: updatedPhoto.likeCount });
}

/** Retracts a like — the inverse of POST above, keyed by the same (photoId, clientId) pair. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: photoId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const clientId = (body as { clientId?: unknown })?.clientId;
  if (typeof clientId !== "string" || clientId.length < 8 || clientId.length > 128) {
    return NextResponse.json({ error: "Missing or invalid clientId." }, { status: 400 });
  }

  const existing = await prisma.like.findUnique({
    where: { photoId_clientId: { photoId, clientId } },
  });
  if (!existing) {
    const current = await prisma.photo.findUnique({
      where: { id: photoId },
      select: { likeCount: true },
    });
    return NextResponse.json({ likeCount: current?.likeCount ?? 0 });
  }

  const [, updatedPhoto] = await prisma.$transaction([
    prisma.like.delete({ where: { photoId_clientId: { photoId, clientId } } }),
    prisma.photo.update({ where: { id: photoId }, data: { likeCount: { decrement: 1 } } }),
  ]);

  return NextResponse.json({ likeCount: updatedPhoto.likeCount });
}
