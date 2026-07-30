import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIp, hashIp } from "@/lib/ip";
import { checkRateLimit } from "@/lib/rateLimit";
import { validateContactInput } from "@/lib/sanitize";
import { toMessageDTO } from "@/types";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const ipHash = hashIp(ip);

  // Spam guard: max 3 messages per 15 minutes per IP.
  const rate = checkRateLimit(`contact:${ipHash}`, { limit: 3, windowMs: 15 * 60_000 });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "You're sending messages too quickly. Please try again later." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = body as { name?: unknown; email?: unknown; message?: unknown };
  const result = validateContactInput(parsed.name, parsed.email, parsed.message);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const message = await prisma.message.create({
    data: {
      name: result.name,
      email: result.email,
      message: result.message,
      ipHash,
    },
  });

  return NextResponse.json({ message: toMessageDTO(message) }, { status: 201 });
}
