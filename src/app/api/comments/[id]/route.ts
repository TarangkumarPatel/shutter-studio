import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRequestCookie } from "@/lib/auth";
import { validateCommentInput } from "@/lib/sanitize";
import { toCommentDTO } from "@/types";

/** Admins can delete any comment; visitors can delete their own (matching clientId). */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const isAdmin = verifyRequestCookie(request.headers.get("cookie"));

  if (!isAdmin) {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      body = null;
    }
    const clientId = (body as { clientId?: unknown })?.clientId;

    const comment = await prisma.comment.findUnique({ where: { id }, select: { clientId: true } });
    if (!comment) {
      return NextResponse.json({ error: "Comment not found." }, { status: 404 });
    }
    if (typeof clientId !== "string" || !comment.clientId || comment.clientId !== clientId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
  }

  try {
    await prisma.comment.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

/** Visitors can edit their own comment (matching clientId) — admins don't get a separate path for this. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = body as { clientId?: unknown; name?: unknown; text?: unknown };

  const comment = await prisma.comment.findUnique({ where: { id } });
  if (!comment) {
    return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  }
  if (
    typeof parsed.clientId !== "string" ||
    !comment.clientId ||
    comment.clientId !== parsed.clientId
  ) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const result = validateCommentInput(parsed.name, parsed.text);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const updated = await prisma.comment.update({
    where: { id },
    data: { name: result.name, text: result.text },
  });

  return NextResponse.json({ comment: toCommentDTO(updated) });
}
