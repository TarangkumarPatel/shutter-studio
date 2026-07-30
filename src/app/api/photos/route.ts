import { NextResponse } from "next/server";
import { getGalleryPhotos } from "@/lib/photos";

export async function GET() {
  const photos = await getGalleryPhotos();
  return NextResponse.json({ photos });
}
