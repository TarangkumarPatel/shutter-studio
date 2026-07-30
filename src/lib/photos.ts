import { prisma } from "./prisma";
import { isNewPhoto, sortPhotosForGallery } from "./sorting";
import { toPhotoDTO, type PhotoDTO } from "@/types";

export async function getGalleryPhotos(): Promise<PhotoDTO[]> {
  const photos = await prisma.photo.findMany({
    include: { _count: { select: { comments: true } } },
  });

  const sorted = sortPhotosForGallery(photos);

  return sorted.map((photo) =>
    toPhotoDTO({ ...photo, commentCount: photo._count.comments }, isNewPhoto(photo.createdAt)),
  );
}

export async function getPhotoById(id: string): Promise<PhotoDTO | null> {
  const photo = await prisma.photo.findUnique({
    where: { id },
    include: { _count: { select: { comments: true } } },
  });
  if (!photo) return null;
  return toPhotoDTO(
    { ...photo, commentCount: photo._count.comments },
    isNewPhoto(photo.createdAt),
  );
}
