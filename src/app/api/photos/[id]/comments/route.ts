import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIp, hashIp } from "@/lib/ip";
import { checkRateLimit } from "@/lib/rateLimit";
import { validateCommentInput } from "@/lib/sanitize";
import { toCommentDTO } from "@/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: photoId } = await params;

  const comments = await prisma.comment.findMany({
    where: { photoId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ comments: comments.map(toCommentDTO) });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: photoId } = await params;

  const photo = await prisma.photo.findUnique({ where: { id: photoId }, select: { id: true } });
  if (!photo) {
    return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  }

  const ip = getClientIp(request.headers);
  const ipHash = hashIp(ip);

  // Spam guard: max 5 comments per 10 minutes per IP, across all photos.
  const rate = checkRateLimit(`comment:${ipHash}`, { limit: 5, windowMs: 10 * 60_000 });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "You're commenting too quickly. Please wait a bit before posting again." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = body as { name?: unknown; text?: unknown };
  const result = validateCommentInput(parsed.name, parsed.text);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const comment = await prisma.comment.create({
    data: { photoId, name: result.name, text: result.text, ipHash },
  });

  return NextResponse.json({ comment: toCommentDTO(comment) }, { status: 201 });
}
