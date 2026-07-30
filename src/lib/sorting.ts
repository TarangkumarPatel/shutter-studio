export const NEW_WINDOW_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export function isNewPhoto(createdAt: Date, now: number = Date.now()): boolean {
  return now - createdAt.getTime() < NEW_WINDOW_MS;
}

/**
 * Sorting rule: gallery order is manually curated by the admin (drag-and-drop
 * in /admin, persisted as `order`). Ties (e.g. freshly-uploaded photos that
 * haven't been repositioned yet, all defaulting to the same order) fall back
 * to newest-first so new work is still visible immediately.
 */
export function sortPhotosForGallery<T extends { order: number; createdAt: Date }>(
  photos: T[],
): T[] {
  return [...photos].sort(
    (a, b) => a.order - b.order || b.createdAt.getTime() - a.createdAt.getTime(),
  );
}
