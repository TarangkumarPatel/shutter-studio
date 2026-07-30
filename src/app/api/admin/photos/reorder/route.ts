import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRequestCookie } from "@/lib/auth";

export async function PATCH(request: NextRequest) {
  if (!verifyRequestCookie(request.headers.get("cookie"))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const ids = (body as { ids?: unknown }).ids;
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string")) {
    return NextResponse.json({ error: "\"ids\" must be an array of photo ids." }, { status: 400 });
  }

  await prisma.$transaction(
    ids.map((id, index) => prisma.photo.update({ where: { id }, data: { order: index } })),
  );

  return NextResponse.json({ ok: true });
}
