import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRequestCookie } from "@/lib/auth";
import { isAllowedImageType, processUploadedPhoto } from "@/lib/image";
import { toPhotoDTO } from "@/types";
import { isNewPhoto } from "@/lib/sorting";

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25MB

export async function POST(request: NextRequest) {
  if (!verifyRequestCookie(request.headers.get("cookie"))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file was uploaded." }, { status: 400 });
  }

  if (!isAllowedImageType(file.type)) {
    return NextResponse.json(
      { error: "Unsupported file type. Please upload a JPG, PNG, or WebP image." },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File is too large (max 25MB)." }, { status: 400 });
  }

  const title = formData.get("title");
  const description = formData.get("description");

  const buffer = Buffer.from(await file.arrayBuffer());

  let processed;
  try {
    processed = await processUploadedPhoto(buffer);
  } catch (err) {
    console.error("Image processing failed:", err);
    return NextResponse.json(
      { error: "Couldn't process that image — is it a valid photo file?" },
      { status: 400 },
    );
  }

  // New uploads jump to the front of the manually-curated gallery order.
  const first = await prisma.photo.findFirst({ orderBy: { order: "asc" } });
  const order = first ? first.order - 1 : 0;

  const photo = await prisma.photo.create({
    data: {
      title: typeof title === "string" && title.trim() ? title.trim().slice(0, 200) : null,
      description:
        typeof description === "string" && description.trim()
          ? description.trim().slice(0, 2000)
          : null,
      storageKey: processed.storageKey,
      originalKey: processed.originalKey,
      width: processed.width,
      height: processed.height,
      blurDataUrl: processed.blurDataUrl,
      order,
    },
  });

  return NextResponse.json(
    { photo: toPhotoDTO({ ...photo, commentCount: 0 }, isNewPhoto(photo.createdAt)) },
    { status: 201 },
  );
}
