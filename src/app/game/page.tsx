import GameArena from "@/components/game/GameArena";
import { getGalleryPhotos } from "@/lib/photos";

export const dynamic = "force-dynamic";

export default async function GamePage() {
  const photos = await getGalleryPhotos();
  return <GameArena photos={photos} />;
}
