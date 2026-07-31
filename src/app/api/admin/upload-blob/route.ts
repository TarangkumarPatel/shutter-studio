import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRequestCookie } from "@/lib/auth";
import { deriveWebVariant } from "@/lib/image";
import { storage } from "@/lib/storage";

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25MB

/**
 * Client-upload token exchange + completion webhook for Vercel Blob.
 *
 * Vercel's serverless functions cap request bodies at 4.5MB — a real photo
 * upload routinely exceeds that, so the browser uploads the original
 * directly to Blob (bypassing our function's body entirely) and only tells
 * us about it afterward via `onUploadCompleted`, where we derive the web
 * variant and create the Photo row. See src/components/admin/UploadForm.tsx
 * for the client side of this.
 */
export async function POST(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie");
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        if (!verifyRequestCookie(cookieHeader)) {
          throw new Error("Unauthorized.");
        }
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
          maximumSizeInBytes: MAX_FILE_BYTES,
          addRandomSuffix: true,
          tokenPayload: clientPayload ?? undefined,
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const meta = tokenPayload
          ? (JSON.parse(tokenPayload) as { title?: string; description?: string })
          : {};

        const originalRes = await fetch(blob.url);
        const originalBuffer = Buffer.from(await originalRes.arrayBuffer());
        const variant = await deriveWebVariant(originalBuffer);

        const storageKey = await storage.save(
          `uploads/web/${randomUUID()}.webp`,
          variant.webBuffer,
        );

        // New uploads jump to the front of the manually-curated gallery order.
        const first = await prisma.photo.findFirst({ orderBy: { order: "asc" } });
        const order = first ? first.order - 1 : 0;

        await prisma.photo.create({
          data: {
            title: meta.title?.trim() ? meta.title.trim().slice(0, 200) : null,
            description: meta.description?.trim()
              ? meta.description.trim().slice(0, 2000)
              : null,
            storageKey,
            originalKey: blob.url,
            width: variant.width,
            height: variant.height,
            blurDataUrl: variant.blurDataUrl,
            order,
          },
        });
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed." },
      { status: 400 }, // Vercel Blob retries the webhook 5x waiting for a 200
    );
  }
}
